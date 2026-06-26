/**
 * webhook-getir
 *
 * Getir platformundan gelen sipariş webhook'larını işler.
 *
 * İmza: X-Getir-Signature: <hmac-sha256-hex>
 *
 * Beklenen payload:
 * {
 *   id: string                        // Getir sipariş UUID'i
 *   restaurantId: string              // Getir restoran ID'si (restaurant_platforms tablosunda eşleştirilir)
 *   status: "NEW" | "CANCELLED"
 *   totalPrice: number
 *   currency: "TRY"
 *   customer: {
 *     name: string
 *     surname: string
 *     deliveryAddress: {
 *       description: string
 *       latitude: number
 *       longitude: number
 *     }
 *   }
 *   products: Array<{ name: string; count: number; totalPrice: number }>
 * }
 */

import { assignCourier } from "../_shared/assignCourier.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import { verifyHmacHex } from "../_shared/crypto.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { logWebhook, markFailed, markProcessed } from "../_shared/webhookLogger.ts";

interface GetirAddress {
  description: string;
  latitude: number;
  longitude: number;
}

interface GetirProduct {
  name: string;
  count: number;
  totalPrice: number;
}

interface GetirPayload {
  id: string;
  restaurantId: string;
  status: "NEW" | "CANCELLED" | string;
  totalPrice: number;
  currency: string;
  customer: {
    name: string;
    surname: string;
    deliveryAddress: GetirAddress;
  };
  products: GetirProduct[];
}

Deno.serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "POST") {
    return errorResponse("Yalnızca POST kabul edilir.", 405);
  }

  // Ham body'yi hem imza doğrulama hem loglama için önce string olarak oku
  const rawBody = await req.text();
  let payload: GetirPayload;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    await logWebhook({
      restaurantId: null,
      platform: "getir",
      rawPayload: { _raw: rawBody },
      error: "JSON parse hatası",
    });
    return errorResponse("Geçersiz JSON.", 400);
  }

  // Platform restoran ID'sini bul → bizim restaurant_id ve webhook_secret'ı al
  const { data: mapping, error: mappingErr } = await supabaseAdmin
    .from("restaurant_platforms")
    .select("restaurant_id, webhook_secret")
    .eq("platform", "getir")
    .eq("platform_restaurant_id", payload.restaurantId)
    .single();

  if (mappingErr || !mapping) {
    await logWebhook({
      restaurantId: null,
      platform: "getir",
      rawPayload: payload,
      error: `Bilinmeyen Getir restoran ID: ${payload.restaurantId}`,
    });
    // Getir'e 200 dön — 4xx döndürmek tekrar denemeye sebep olur
    return jsonResponse({ received: true, processed: false });
  }

  // HMAC-SHA256 imza doğrulama
  const signature = req.headers.get("x-getir-signature") ?? "";
  const isValid = await verifyHmacHex(mapping.webhook_secret, rawBody, signature);

  if (!isValid) {
    await logWebhook({
      restaurantId: mapping.restaurant_id,
      platform: "getir",
      rawPayload: payload,
      error: "İmza doğrulama başarısız",
    });
    return errorResponse("İmza geçersiz.", 401);
  }

  const webhookId = await logWebhook({
    restaurantId: mapping.restaurant_id,
    platform: "getir",
    rawPayload: payload,
  });

  // Sadece yeni siparişleri işle
  if (payload.status === "CANCELLED") {
    // Varsa mevcut siparişi iptal et
    await supabaseAdmin
      .from("orders")
      .update({ status: "cancelled" })
      .eq("platform", "getir")
      .eq("platform_order_id", payload.id)
      .eq("restaurant_id", mapping.restaurant_id);

    if (webhookId) await markProcessed(webhookId);
    return jsonResponse({ received: true, action: "cancelled" });
  }

  if (payload.status !== "NEW") {
    if (webhookId) await markProcessed(webhookId);
    return jsonResponse({ received: true, action: "ignored", status: payload.status });
  }

  // Siparişi orders tablosuna ekle
  const addr = payload.customer.deliveryAddress;
  const items = payload.products.map((p) => ({
    name: p.name,
    quantity: p.count,
    price: p.totalPrice,
  }));

  const { data: order, error: insertErr } = await supabaseAdmin
    .from("orders")
    .insert({
      restaurant_id: mapping.restaurant_id,
      platform: "getir",
      platform_order_id: payload.id,
      customer_name: `${payload.customer.name} ${payload.customer.surname}`.trim(),
      customer_address: addr.description,
      customer_lat: addr.latitude,
      customer_lng: addr.longitude,
      total_amount: payload.totalPrice,
      items,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertErr || !order) {
    const errMsg = insertErr?.message ?? "Bilinmeyen insert hatası";
    console.error("[webhook-getir] Sipariş eklenemedi:", errMsg);
    if (webhookId) await markFailed(webhookId, errMsg);
    return errorResponse("Sipariş kaydedilemedi.", 500);
  }

  // En yakın kurye atama
  const { courierId, error: assignErr } = await assignCourier(order.id);
  if (assignErr) {
    console.warn("[webhook-getir] Kurye ataması:", assignErr);
  }

  if (webhookId) await markProcessed(webhookId);

  return jsonResponse({
    received: true,
    orderId: order.id,
    courierId: courierId ?? null,
  });
});
