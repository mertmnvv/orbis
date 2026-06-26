/**
 * webhook-trendyol
 *
 * Trendyol GoFOOD platformundan gelen sipariş webhook'larını işler.
 *
 * İmza: X-Trendyol-Signature: <hmac-sha256-hex>
 *
 * Beklenen payload:
 * {
 *   orderId: string                   // Trendyol sipariş ID'si
 *   restaurantId: string              // Trendyol restoran ID'si
 *   orderStatus: "Created" | "Cancelled"
 *   grossAmount: number
 *   invoiceAddress: {
 *     fullName: string
 *     streetAndNumber: string
 *     geoCoordinate: {
 *       latitude: number
 *       longitude: number
 *     }
 *   }
 *   lines: Array<{ productName: string; quantity: number; amount: number }>
 * }
 */

import { assignCourier } from "../_shared/assignCourier.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import { verifyHmacHex } from "../_shared/crypto.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { logWebhook, markFailed, markProcessed } from "../_shared/webhookLogger.ts";

interface TrendyolGeoCoordinate {
  latitude: number;
  longitude: number;
}

interface TrendyolLine {
  productName: string;
  quantity: number;
  amount: number;
}

interface TrendyolPayload {
  orderId: string;
  restaurantId: string;
  orderStatus: "Created" | "Cancelled" | string;
  grossAmount: number;
  invoiceAddress: {
    fullName: string;
    streetAndNumber: string;
    geoCoordinate: TrendyolGeoCoordinate;
  };
  lines: TrendyolLine[];
}

Deno.serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "POST") {
    return errorResponse("Yalnızca POST kabul edilir.", 405);
  }

  const rawBody = await req.text();
  let payload: TrendyolPayload;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    await logWebhook({
      restaurantId: null,
      platform: "trendyol",
      rawPayload: { _raw: rawBody },
      error: "JSON parse hatası",
    });
    return errorResponse("Geçersiz JSON.", 400);
  }

  const { data: mapping, error: mappingErr } = await supabaseAdmin
    .from("restaurant_platforms")
    .select("restaurant_id, webhook_secret")
    .eq("platform", "trendyol")
    .eq("platform_restaurant_id", payload.restaurantId)
    .single();

  if (mappingErr || !mapping) {
    await logWebhook({
      restaurantId: null,
      platform: "trendyol",
      rawPayload: payload,
      error: `Bilinmeyen Trendyol restoran ID: ${payload.restaurantId}`,
    });
    return jsonResponse({ received: true, processed: false });
  }

  // Trendyol hex HMAC-SHA256 kullanır
  const signature = req.headers.get("x-trendyol-signature") ?? "";
  const isValid = await verifyHmacHex(mapping.webhook_secret, rawBody, signature);

  if (!isValid) {
    await logWebhook({
      restaurantId: mapping.restaurant_id,
      platform: "trendyol",
      rawPayload: payload,
      error: "İmza doğrulama başarısız",
    });
    return errorResponse("İmza geçersiz.", 401);
  }

  const webhookId = await logWebhook({
    restaurantId: mapping.restaurant_id,
    platform: "trendyol",
    rawPayload: payload,
  });

  if (payload.orderStatus === "Cancelled") {
    await supabaseAdmin
      .from("orders")
      .update({ status: "cancelled" })
      .eq("platform", "trendyol")
      .eq("platform_order_id", payload.orderId)
      .eq("restaurant_id", mapping.restaurant_id);

    if (webhookId) await markProcessed(webhookId);
    return jsonResponse({ received: true, action: "cancelled" });
  }

  if (payload.orderStatus !== "Created") {
    if (webhookId) await markProcessed(webhookId);
    return jsonResponse({ received: true, action: "ignored", status: payload.orderStatus });
  }

  const addr = payload.invoiceAddress;
  const items = payload.lines.map((l) => ({
    name: l.productName,
    quantity: l.quantity,
    price: l.amount,
  }));

  const { data: order, error: insertErr } = await supabaseAdmin
    .from("orders")
    .insert({
      restaurant_id: mapping.restaurant_id,
      platform: "trendyol",
      platform_order_id: payload.orderId,
      customer_name: addr.fullName,
      customer_address: addr.streetAndNumber,
      customer_lat: addr.geoCoordinate.latitude,
      customer_lng: addr.geoCoordinate.longitude,
      total_amount: payload.grossAmount,
      items,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertErr || !order) {
    const errMsg = insertErr?.message ?? "Bilinmeyen insert hatası";
    console.error("[webhook-trendyol] Sipariş eklenemedi:", errMsg);
    if (webhookId) await markFailed(webhookId, errMsg);
    return errorResponse("Sipariş kaydedilemedi.", 500);
  }

  const { courierId, error: assignErr } = await assignCourier(order.id);
  if (assignErr) {
    console.warn("[webhook-trendyol] Kurye ataması:", assignErr);
  }

  if (webhookId) await markProcessed(webhookId);

  return jsonResponse({
    received: true,
    orderId: order.id,
    courierId: courierId ?? null,
  });
});
