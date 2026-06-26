-- ============================================================
-- 003_realtime_couriers.sql
-- couriers tablosunu Supabase Realtime yayınına ekle
-- (Kurye konum güncellemeleri web paneline anlık iletilsin)
-- ============================================================

alter publication supabase_realtime add table couriers;
