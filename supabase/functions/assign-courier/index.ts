/**
 * assign-courier
 *
 * Belirtilen siparişe en yakın müsait kuryeyi atar.
 * Webhook fonksiyonları paylaşılan assignCourier modülünü doğrudan çağırır;
 * bu HTTP endpoint manuel tetikleme ve DB webhook'ları için kullanılır.
 *
 * POST /functions/v1/assign-courier
 * Authorization: Bearer <service-role-key>
 * Body: { "orderId": "uuid" }
 *
 * Yanıt: { orderId, courierId, error }
 */

import { assignCourier } from "../_shared/assignCourier.ts";
import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "POST") {
    return errorResponse("Yalnızca POST kabul edilir.", 405);
  }

  // Service role key doğrulaması (Supabase Gateway otomatik olarak kontrol eder,
  // ek güvenlik için Authorization başlığını da doğrulayabiliriz)
  const authHeader = req.headers.get("authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!authHeader.includes(serviceRoleKey)) {
    return errorResponse("Yetkisiz erişim.", 403);
  }

  let body: { orderId?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Geçersiz JSON.", 400);
  }

  if (!body.orderId) {
    return errorResponse("orderId gereklidir.", 400);
  }

  const { courierId, error } = await assignCourier(body.orderId);

  if (error && !courierId) {
    return jsonResponse({ orderId: body.orderId, courierId: null, error }, 200);
  }

  return jsonResponse({ orderId: body.orderId, courierId, error: null });
});
