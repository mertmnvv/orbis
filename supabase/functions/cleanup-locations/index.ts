/**
 * cleanup-locations
 *
 * 7 günden eski courier_locations kayıtlarını siler.
 * Supabase Dashboard → Edge Function Schedules veya pg_cron ile günlük tetiklenir.
 *
 * Manuel tetikleme:
 *   curl -X POST https://<project>.supabase.co/functions/v1/cleanup-locations \
 *     -H "Authorization: Bearer <service-role-key>"
 *
 * pg_cron ile (bkz. 004_cron_cleanup.sql):
 *   SELECT cron.schedule('cleanup-courier-locations', '0 3 * * *',
 *     $$SELECT net.http_post(...)$$);
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const RETENTION_DAYS = 7;

Deno.serve(async (req: Request) => {
  // Yalnızca service role key ile erişime izin ver
  const authHeader = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!authHeader.includes(serviceKey)) {
    return new Response(JSON.stringify({ error: "Yetkisiz erişim." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "POST veya GET gerekli." }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const cutoff = new Date(
    Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Kaç kayıt silineceğini önce say (loglama için)
  const { count: totalBefore } = await supabase
    .from("courier_locations")
    .select("*", { count: "exact", head: true })
    .lt("recorded_at", cutoff);

  if (totalBefore === 0) {
    console.info(`[cleanup] ${cutoff} öncesi silinecek kayıt yok.`);
    return Response.json({ deleted: 0, cutoff, retention_days: RETENTION_DAYS });
  }

  // Büyük tablolarda batch silme (tek seferde en fazla 1000 satır)
  let totalDeleted = 0;
  const BATCH = 1000;

  while (true) {
    // Silinecek ID'leri al
    const { data: batch, error: selectErr } = await supabase
      .from("courier_locations")
      .select("id")
      .lt("recorded_at", cutoff)
      .limit(BATCH);

    if (selectErr) {
      console.error("[cleanup] Seçim hatası:", selectErr.message);
      return Response.json({ error: selectErr.message }, { status: 500 });
    }

    if (!batch || batch.length === 0) break;

    const ids = batch.map((r: { id: string }) => r.id);
    const { error: deleteErr } = await supabase
      .from("courier_locations")
      .delete()
      .in("id", ids);

    if (deleteErr) {
      console.error("[cleanup] Silme hatası:", deleteErr.message);
      return Response.json(
        { error: deleteErr.message, deleted: totalDeleted },
        { status: 500 },
      );
    }

    totalDeleted += batch.length;
    console.info(`[cleanup] ${totalDeleted} kayıt silindi…`);

    if (batch.length < BATCH) break; // Son batch
  }

  const result = {
    deleted: totalDeleted,
    cutoff,
    retention_days: RETENTION_DAYS,
    ran_at: new Date().toISOString(),
  };
  console.info("[cleanup] Tamamlandı:", result);

  return Response.json(result);
});
