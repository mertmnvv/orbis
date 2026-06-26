/**
 * webhook-yemeksepeti
 *
 * Yemeksepeti platformundan gelen sipariş webhook'larını işler.
 *
 * İmza: X-Signature: <hmac-sha256-base64>
 *
 * Beklenen payload:
 * {
 *   orderId: string                   // Yemeksepeti sipariş ID'si
 *   restaurantId: string              // Yemeksepeti restoran ID'si
 *   orderStatus: "NEW" | "CANCELLED"
 *   grossAmount: number
 *   client: {
 *     firstName: string
 *     lastName: string
 *     address: {
 *       addressText: string
 *       latitude: string              // Yemeksepeti string olarak gönderir
 *       longitude: string
 *     }
 *   }
 *   basket: Array<{ productName: string; quantity: number; totalPrice: number }>
 * }
 */

import { assignCourier } from "../_shared/assignCourier.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import { verifyHmacBase64 } from "../_shared/crypto.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { logWebhook, markFailed, markProcessed } from "../_shared/webhookLogger.ts";

interface YsAddress {
  addressText: string;
  latitude: string;
  longitude: string;
}

interface YsBasketItem {
  productName: string;
  quantity: number;
  totalPrice: number;
}

interface YemeksepetıPayload {
  orderId: string;
  restaurantId: string;
  orderStatus: "NEW" | "CANCELLED" | string;
  grossAmount: number;
  client: {
    firstName: string;
    lastName: string;
    address: YsAddress;
  };
  basket: YsBasketItem[];
}

Deno.serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "POST") {
    return errorResponse("Yalnızca POST kabul edilir.", 405);
  }

  const rawBody = await req.text();
  let payload: YemeksepetıPayload;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    await logWebhook({
      restaurantId: null,
      platform: "yemeksepeti",
      rawPayload: { _raw: rawBody },
      error: "JSON parse hatası",
    });
    return errorResponse("Geçersiz JSON.", 400);
  }

  const { data: mapping, error: mappingErr } = await supabaseAdmin
    .from("restaurant_platforms")
    .select("restaurant_id, webhook_secret")
    .eq("platform", "yemeksepeti")
    .eq("platform_restaurant_id", payload.restaurantId)
    .single();

  if (mappingErr || !mapping) {
    await logWebhook({
      restaurantId: null,
      platform: "yemeksepeti",
      rawPayload: payload,
      error: `Bilinmeyen YS restoran ID: ${payload.restaurantId}`,
    });
    return jsonResponse({ received: true, processed: false });
  }

  // Yemeksepeti base64 HMAC-SHA256 kullanır
  const signature = req.headers.get("x-signature") ?? "";
  const isValid = await verifyHmacBase64(mapping.webhook_secret, rawBody, signature);

  if (!isValid) {
    await logWebhook({
      restaurantId: mapping.restaurant_id,
      platform: "yemeksepeti",
      rawPayload: payload,
      error: "İmza doğrulama başarısız",
    });
    return errorResponse("İmza geçersiz.", 401);
  }

  const webhookId = await logWebhook({
    restaurantId: mapping.restaurant_id,
    platform: "yemeksepeti",
    rawPayload: payload,
  });

  if (payload.orderStatus === "CANCELLED") {
    await supabaseAdmin
      .from("orders")
      .update({ status: "cancelled" })
      .eq("platform", "yemeksepeti")
      .eq("platform_order_id", payload.orderId)
      .eq("restaurant_id", mapping.restaurant_id);

    if (webhookId) await markProcessed(webhookId);
    return jsonResponse({ received: true, action: "cancelled" });
  }

  if (payload.orderStatus !== "NEW") {
    if (webhookId) await markProcessed(webhookId);
    return jsonResponse({ received: true, action: "ignored", status: payload.orderStatus });
  }

  const addr = payload.client.address;
  const items = payload.basket.map((b) => ({
    name: b.productName,
    quantity: b.quantity,
    price: b.totalPrice,
  }));

  const { data: order, error: insertErr } = await supabaseAdmin
    .from("orders")
    .insert({
      restaurant_id: mapping.restaurant_id,
      platform: "yemeksepeti",
      platform_order_id: payload.orderId,
      customer_name: `${payload.client.firstName} ${payload.client.lastName}`.trim(),
      customer_address: addr.addressText,
      customer_lat: parseFloat(addr.latitude),
      customer_lng: parseFloat(addr.longitude),
      total_amount: payload.grossAmount,
      items,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertErr || !order) {
    const errMsg = insertErr?.message ?? "Bilinmeyen insert hatası";
    console.error("[webhook-yemeksepeti] Sipariş eklenemedi:", errMsg);
    if (webhookId) await markFailed(webhookId, errMsg);
    return errorResponse("Sipariş kaydedilemedi.", 500);
  }

  const { courierId, error: assignErr } = await assignCourier(order.id);
  if (assignErr) {
    console.warn("[webhook-yemeksepeti] Kurye ataması:", assignErr);
  }

  if (webhookId) await markProcessed(webhookId);

  return jsonResponse({
    received: true,
    orderId: order.id,
    courierId: courierId ?? null,
  });
});
