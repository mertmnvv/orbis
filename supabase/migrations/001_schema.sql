-- ============================================================
-- 001_schema.sql  —  Orbis courier tracking
-- SQL Editor'da tek seferde çalıştırın
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUM TİPLERİ
-- ============================================================
create type platform_type as enum (
  'yemeksepeti', 'getir', 'trendyol', 'pakettaksi', 'manual'
);

create type order_status as enum (
  'pending', 'assigned', 'picked_up', 'delivered', 'cancelled'
);

create type vehicle_type as enum (
  'bicycle', 'motorcycle', 'car', 'scooter', 'on_foot'
);

-- ============================================================
-- TABLOLAR
-- ============================================================

create table restaurants (
  id         uuid          primary key default uuid_generate_v4(),
  user_id    uuid          not null references auth.users(id) on delete cascade,
  name       text          not null,
  address    text          not null,
  lat        numeric(10,7) not null,
  lng        numeric(10,7) not null,
  phone      text,
  created_at timestamptz   not null default now()
);

create table couriers (
  id           uuid         primary key default uuid_generate_v4(),
  user_id      uuid         not null references auth.users(id) on delete cascade,
  name         text         not null,
  phone        text         not null,
  vehicle_type vehicle_type not null default 'motorcycle',
  is_active    boolean      not null default true,
  current_lat  numeric(10,7),
  current_lng  numeric(10,7),
  fcm_token    text,
  last_seen_at timestamptz,
  created_at   timestamptz  not null default now()
);

create table orders (
  id                uuid          primary key default uuid_generate_v4(),
  restaurant_id     uuid          not null references restaurants(id) on delete restrict,
  courier_id        uuid          references couriers(id) on delete set null,
  platform          platform_type not null,
  platform_order_id text,
  customer_name     text          not null,
  customer_address  text          not null,
  customer_lat      numeric(10,7),
  customer_lng      numeric(10,7),
  customer_phone    text,
  items             jsonb         not null default '[]',
  status            order_status  not null default 'pending',
  total_amount      numeric(10,2) not null default 0,
  created_at        timestamptz   not null default now(),
  assigned_at       timestamptz,
  picked_up_at      timestamptz,
  delivered_at      timestamptz
);

create table courier_locations (
  id          uuid          primary key default uuid_generate_v4(),
  courier_id  uuid          not null references couriers(id) on delete cascade,
  lat         numeric(10,7) not null,
  lng         numeric(10,7) not null,
  recorded_at timestamptz   not null default now()
);

-- ============================================================
-- INDEX'LER
-- ============================================================
create index idx_orders_status           on orders (status);
create index idx_orders_restaurant_id    on orders (restaurant_id);
create index idx_orders_courier_id       on orders (courier_id);
create index idx_couriers_user_id        on couriers (user_id);
create index idx_restaurants_user_id     on restaurants (user_id);
create index idx_courier_locations_time  on courier_locations (courier_id, recorded_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table restaurants       enable row level security;
alter table couriers          enable row level security;
alter table orders            enable row level security;
alter table courier_locations enable row level security;

-- ---- restaurants ----
-- KURAL: restaurants policy'leri orders tablosuna ASLA bakamaz (sonsuz döngü olur)

create policy "restaurants: owner all"
  on restaurants for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Kurye tüm restoranları okuyabilir (sadece couriers tablosuna bakar, orders'a BAKMAZ)
create policy "restaurants: courier read"
  on restaurants for select
  using (
    exists (select 1 from couriers c where c.user_id = auth.uid())
  );

-- ---- couriers ----

create policy "couriers: self all"
  on couriers for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- orders ----
-- orders policy'leri restaurants'a bakabilir çünkü restaurants artık orders'a BAKMIYOR

create policy "orders: restaurant owner all"
  on orders for all
  using (
    exists (select 1 from restaurants r where r.id = orders.restaurant_id and r.user_id = auth.uid())
  )
  with check (
    exists (select 1 from restaurants r where r.id = restaurant_id and r.user_id = auth.uid())
  );

-- Kurye bekleyen siparişleri listeler
create policy "orders: courier read pending"
  on orders for select
  using (
    status = 'pending'
    and exists (select 1 from couriers c where c.user_id = auth.uid())
  );

-- Kurye atandığı siparişi görür
create policy "orders: courier read assigned"
  on orders for select
  using (
    exists (select 1 from couriers c where c.id = orders.courier_id and c.user_id = auth.uid())
  );

-- Kurye pending siparişi kabul eder
create policy "orders: courier accept"
  on orders for update
  using (
    status = 'pending'
    and exists (select 1 from couriers c where c.user_id = auth.uid())
  )
  with check (
    status = 'assigned'
    and exists (select 1 from couriers c where c.user_id = auth.uid() and c.id = courier_id)
  );

-- Kurye durumu günceller (picked_up, delivered)
create policy "orders: courier update status"
  on orders for update
  using (
    exists (select 1 from couriers c where c.id = orders.courier_id and c.user_id = auth.uid())
  )
  with check (
    exists (select 1 from couriers c where c.id = courier_id and c.user_id = auth.uid())
  );

-- ---- courier_locations ----

create policy "courier_locations: courier insert"
  on courier_locations for insert
  with check (
    exists (select 1 from couriers c where c.id = courier_id and c.user_id = auth.uid())
  );

create policy "courier_locations: courier read"
  on courier_locations for select
  using (
    exists (select 1 from couriers c where c.id = courier_locations.courier_id and c.user_id = auth.uid())
  );

create policy "courier_locations: restaurant owner read"
  on courier_locations for select
  using (
    exists (
      select 1 from orders o
      join restaurants r on r.id = o.restaurant_id
      where o.courier_id = courier_locations.courier_id
        and r.user_id = auth.uid()
    )
  );

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table courier_locations;
alter publication supabase_realtime add table couriers;

-- ============================================================
-- TEST VERİSİ
-- ============================================================
do $$
declare
  v_user_id       uuid;
  v_restaurant_id uuid := 'a0000000-0000-0000-0000-000000000001';
begin
  select id into v_user_id from auth.users order by created_at limit 1;
  if v_user_id is null then
    raise exception 'auth.users boş — önce uygulamadan giriş yapın';
  end if;

  insert into restaurants (id, user_id, name, address, lat, lng, phone)
  values (
    v_restaurant_id, v_user_id,
    'Orbis Test Restoran', 'Bağcılar Mah. Test Sk. No:1, İstanbul',
    41.0470, 28.8560, '+90 212 555 0000'
  ) on conflict (id) do nothing;

  -- Courier kaydı yoksa oluştur
  insert into couriers (user_id, name, phone, vehicle_type)
  select v_user_id, 'Test Kurye', '+905550000000', 'motorcycle'
  where not exists (select 1 from couriers where user_id = v_user_id);

  -- Test siparişleri
  insert into orders (restaurant_id, platform, customer_name, customer_address, customer_lat, customer_lng, customer_phone, items, total_amount)
  values
  (v_restaurant_id, 'manual', 'Ali Veli',
   'Kadıköy Mah. Moda Cd. No:12, İstanbul', 40.9870, 29.0300, '+90 533 111 2233',
   '[{"name":"Adana Kebap","quantity":2,"price":85},{"name":"Ayran","quantity":2,"price":15}]', 200.00),
  (v_restaurant_id, 'yemeksepeti', 'Fatma Yılmaz',
   'Şişli Mah. Halaskargazi Cd. No:7, İstanbul', 41.0600, 28.9870, '+90 542 444 5566',
   '[{"name":"İskender","quantity":1,"price":120},{"name":"Kola","quantity":1,"price":20}]', 140.00),
  (v_restaurant_id, 'getir', 'Mehmet Kaya',
   'Beşiktaş Mah. Barbaros Bul. No:50, İstanbul', 41.0430, 29.0050, '+90 555 777 8899',
   '[{"name":"Tavuk Döner","quantity":3,"price":65},{"name":"Şalgam","quantity":1,"price":10}]', 205.00);

  raise notice 'Tamamlandı! Kullanıcı: %', v_user_id;
end $$;
