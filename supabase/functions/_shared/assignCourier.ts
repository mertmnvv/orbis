import { sendPushNotification } from "./fcm.ts";
import { supabaseAdmin } from "./supabaseAdmin.ts";

interface AssignResult {
  courierId: string | null;
  error: string | null;
}

interface NearestCourier {
  id: string;
  name: string;
  fcm_token: string | null;
  current_lat: number | null;
  current_lng: number | null;
}

/**
 * En yakın müsait kurye bulunur, siparişe atanır, FCM push gönderilir.
 *
 * Önce PostGIS RPC'si denenir (find_nearest_courier).
 * Eğer PostGIS migration henüz uygulanmamışsa basit Öklid mesafesi fallback'i devreye girer.
 */
export async function assignCourier(orderId: string): Promise<AssignResult> {
  // Siparişin restoran koordinatlarını çek (kurye restorana en yakın olmalı)
  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .select("id, status, restaurant_id, restaurants(lat, lng)")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    return { courierId: null, error: `Sipariş bulunamadı: ${orderErr?.message}` };
  }
  if (order.status !== "pending") {
    return { courierId: null, error: `Sipariş zaten ${order.status} durumunda.` };
  }

  const restaurant = order.restaurants as { lat: number; lng: number } | null;
  if (!restaurant) {
    return { courierId: null, error: "Restoran koordinatları bulunamadı." };
  }

  // --- PostGIS RPC denemesi ---
  const { data: nearest, error: rpcErr } = await supabaseAdmin.rpc<NearestCourier>(
    "find_nearest_courier",
    { order_lat: restaurant.lat, order_lng: restaurant.lng },
  );

  let courier: NearestCourier | null = nearest ?? null;

  if (rpcErr) {
    console.warn("[assign] PostGIS RPC başarısız, fallback kullanılıyor:", rpcErr.message);
    courier = await fallbackNearestCourier(restaurant.lat, restaurant.lng);
  }

  if (!courier) {
    return { courierId: null, error: "Müsait kurye bulunamadı." };
  }

  return await performAssignment(orderId, courier);
}

/** PostGIS olmadığında Öklid mesafesiyle en yakın kurye bulur. */
async function fallbackNearestCourier(
  lat: number,
  lng: number,
): Promise<NearestCourier | null> {
  const { data: allCouriers } = await supabaseAdmin
    .from("couriers")
    .select("id, name, fcm_token, current_lat, current_lng")
    .eq("is_active", true)
    .not("current_lat", "is", null);

  if (!allCouriers?.length) return null;

  const { data: busyRows } = await supabaseAdmin
    .from("orders")
    .select("courier_id")
    .in("status", ["assigned", "picked_up"])
    .not("courier_id", "is", null);

  const busyIds = new Set((busyRows ?? []).map((r: { courier_id: string }) => r.courier_id));
  const available = (allCouriers as NearestCourier[]).filter((c) => !busyIds.has(c.id));

  if (!available.length) return null;

  return available.sort((a, b) => {
    const da = Math.hypot((a.current_lat ?? 0) - lat, (a.current_lng ?? 0) - lng);
    const db = Math.hypot((b.current_lat ?? 0) - lat, (b.current_lng ?? 0) - lng);
    return da - db;
  })[0];
}

async function performAssignment(
  orderId: string,
  courier: NearestCourier,
): Promise<AssignResult> {
  const { error: updateErr } = await supabaseAdmin
    .from("orders")
    .update({
      courier_id: courier.id,
      status: "assigned",
      assigned_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "pending"); // Race condition koruması: sadece hâlâ pending ise güncelle

  if (updateErr) {
    return { courierId: null, error: `Kurye ataması başarısız: ${updateErr.message}` };
  }

  // FCM push — başarısız olursa atamayı geri alma; sadece logla
  if (courier.fcm_token) {
    try {
      await sendPushNotification({
        fcmToken: courier.fcm_token,
        title: "🚀 Yeni Sipariş!",
        body: "Size yeni bir teslimat atandı. Hemen kontrol edin.",
        data: { orderId, type: "new_order" },
      });
    } catch (err) {
      console.error("[assign] FCM push başarısız:", err);
    }
  } else {
    console.warn(`[assign] Kurye ${courier.id} için fcm_token bulunamadı.`);
  }

  console.info(`[assign] Sipariş ${orderId} → Kurye ${courier.name} (${courier.id})`);
  return { courierId: courier.id, error: null };
}
