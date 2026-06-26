-- ============================================================
-- 001_initial_schema.sql
-- Restaurant courier tracking — initial schema
-- ============================================================

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- Enum types
-- ============================================================
create type platform_type as enum (
  'yemeksepeti',
  'getir',
  'trendyol',
  'pakettaksi',
  'manual'
);

create type order_status as enum (
  'pending',
  'assigned',
  'picked_up',
  'delivered',
  'cancelled'
);

create type vehicle_type as enum (
  'bicycle',
  'motorcycle',
  'car',
  'scooter',
  'on_foot'
);

-- ============================================================
-- Tables
-- ============================================================

-- restaurants
-- user_id ties a restaurant to its owning auth.users row,
-- which is required for RLS row ownership checks.
create table restaurants (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  name        text        not null,
  address     text        not null,
  lat         numeric(10, 7) not null,
  lng         numeric(10, 7) not null,
  phone       text,
  created_at  timestamptz not null default now()
);

-- couriers
create table couriers (
  id              uuid        primary key default uuid_generate_v4(),
  user_id         uuid        not null references auth.users (id) on delete cascade,
  name            text        not null,
  phone           text        not null,
  vehicle_type    vehicle_type not null default 'motorcycle',
  is_active       boolean     not null default true,
  current_lat     numeric(10, 7),
  current_lng     numeric(10, 7),
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- orders
create table orders (
  id                  uuid         primary key default uuid_generate_v4(),
  restaurant_id       uuid         not null references restaurants (id) on delete restrict,
  courier_id          uuid         references couriers (id) on delete set null,
  platform            platform_type not null,
  platform_order_id   text,
  customer_name       text         not null,
  customer_address    text         not null,
  customer_lat        numeric(10, 7),
  customer_lng        numeric(10, 7),
  status              order_status  not null default 'pending',
  total_amount        numeric(10, 2) not null default 0,
  created_at          timestamptz  not null default now(),
  assigned_at         timestamptz,
  picked_up_at        timestamptz,
  delivered_at        timestamptz
);

-- courier_locations — append-only route history
create table courier_locations (
  id          uuid        primary key default uuid_generate_v4(),
  courier_id  uuid        not null references couriers (id) on delete cascade,
  lat         numeric(10, 7) not null,
  lng         numeric(10, 7) not null,
  recorded_at timestamptz not null default now()
);

-- platform_webhooks — raw inbound payloads from delivery platforms
create table platform_webhooks (
  id              uuid        primary key default uuid_generate_v4(),
  restaurant_id   uuid        not null references restaurants (id) on delete cascade,
  platform        platform_type not null,
  raw_payload     jsonb       not null,
  processed_at    timestamptz
);

-- ============================================================
-- Indexes
-- ============================================================
create index idx_orders_status
  on orders (status);

create index idx_orders_restaurant_id
  on orders (restaurant_id);

-- Composite: most queries filter by courier then sort by time
create index idx_courier_locations_courier_id_recorded_at
  on courier_locations (courier_id, recorded_at desc);

-- Supporting indexes for common join / lookup patterns
create index idx_orders_courier_id
  on orders (courier_id);

create index idx_couriers_user_id
  on couriers (user_id);

create index idx_restaurants_user_id
  on restaurants (user_id);

create index idx_platform_webhooks_restaurant_platform
  on platform_webhooks (restaurant_id, platform);

-- Partial index for unprocessed webhooks (keeps the queue query fast)
create index idx_platform_webhooks_unprocessed
  on platform_webhooks (restaurant_id, platform)
  where processed_at is null;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table restaurants         enable row level security;
alter table couriers            enable row level security;
alter table orders              enable row level security;
alter table courier_locations   enable row level security;
alter table platform_webhooks   enable row level security;

-- ----------------------------------------------------------------
-- Helper: reusable inline check — is the calling user a courier
-- linked to a given restaurant's orders?
-- (used in courier policies below)
-- ----------------------------------------------------------------

-- ----------------------------------------------------------------
-- restaurants policies
-- ----------------------------------------------------------------

-- Restaurant owners see only their own restaurant row
create policy "restaurants: owner can read"
  on restaurants for select
  using (user_id = auth.uid());

-- Owner can insert their own restaurant
create policy "restaurants: owner can insert"
  on restaurants for insert
  with check (user_id = auth.uid());

-- Owner can update their own restaurant
create policy "restaurants: owner can update"
  on restaurants for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Owner can delete their own restaurant
create policy "restaurants: owner can delete"
  on restaurants for delete
  using (user_id = auth.uid());

-- Couriers need to read the restaurant row for orders they are assigned to
create policy "restaurants: assigned courier can read"
  on restaurants for select
  using (
    exists (
      select 1 from orders o
      join couriers c on c.id = o.courier_id
      where o.restaurant_id = restaurants.id
        and c.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- couriers policies
-- ----------------------------------------------------------------

-- A courier manages their own profile
create policy "couriers: self read"
  on couriers for select
  using (user_id = auth.uid());

create policy "couriers: self insert"
  on couriers for insert
  with check (user_id = auth.uid());

create policy "couriers: self update"
  on couriers for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Restaurant owners see all couriers who have orders at their restaurant
create policy "couriers: restaurant owner can read"
  on couriers for select
  using (
    exists (
      select 1 from orders o
      join restaurants r on r.id = o.restaurant_id
      where o.courier_id = couriers.id
        and r.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- orders policies
-- ----------------------------------------------------------------

-- Restaurant owner sees all orders for their restaurant
create policy "orders: restaurant owner can read"
  on orders for select
  using (
    exists (
      select 1 from restaurants r
      where r.id = orders.restaurant_id
        and r.user_id = auth.uid()
    )
  );

create policy "orders: restaurant owner can insert"
  on orders for insert
  with check (
    exists (
      select 1 from restaurants r
      where r.id = restaurant_id
        and r.user_id = auth.uid()
    )
  );

create policy "orders: restaurant owner can update"
  on orders for update
  using (
    exists (
      select 1 from restaurants r
      where r.id = orders.restaurant_id
        and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from restaurants r
      where r.id = restaurant_id
        and r.user_id = auth.uid()
    )
  );

create policy "orders: restaurant owner can delete"
  on orders for delete
  using (
    exists (
      select 1 from restaurants r
      where r.id = orders.restaurant_id
        and r.user_id = auth.uid()
    )
  );

-- Courier sees only their own assigned orders
create policy "orders: assigned courier can read"
  on orders for select
  using (
    exists (
      select 1 from couriers c
      where c.id = orders.courier_id
        and c.user_id = auth.uid()
    )
  );

-- Courier may update status fields on their own orders
-- (e.g. mark picked_up or delivered) — but not reassign restaurant/courier
create policy "orders: assigned courier can update status"
  on orders for update
  using (
    exists (
      select 1 from couriers c
      where c.id = orders.courier_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    -- courier cannot change restaurant or transfer to another courier
    restaurant_id = (select restaurant_id from orders where id = orders.id)
    and courier_id = (select courier_id  from orders where id = orders.id)
  );

-- ----------------------------------------------------------------
-- courier_locations policies
-- ----------------------------------------------------------------

-- Couriers insert their own location pings
create policy "courier_locations: courier can insert"
  on courier_locations for insert
  with check (
    exists (
      select 1 from couriers c
      where c.id = courier_id
        and c.user_id = auth.uid()
    )
  );

-- Couriers can read their own location history
create policy "courier_locations: courier can read own"
  on courier_locations for select
  using (
    exists (
      select 1 from couriers c
      where c.id = courier_locations.courier_id
        and c.user_id = auth.uid()
    )
  );

-- Restaurant owners can read locations of couriers assigned to their orders
create policy "courier_locations: restaurant owner can read"
  on courier_locations for select
  using (
    exists (
      select 1
      from orders o
      join restaurants r on r.id = o.restaurant_id
      where o.courier_id = courier_locations.courier_id
        and r.user_id   = auth.uid()
    )
  );

-- Location records are immutable — no update/delete via client
-- (use the service_role key from backend jobs if cleanup is needed)

-- ----------------------------------------------------------------
-- platform_webhooks policies
-- ----------------------------------------------------------------

-- Webhooks are written by backend / edge functions using the service_role key.
-- Regular authenticated users should never touch this table directly.

-- Restaurant owners can audit their own webhook history
create policy "platform_webhooks: restaurant owner can read"
  on platform_webhooks for select
  using (
    exists (
      select 1 from restaurants r
      where r.id = platform_webhooks.restaurant_id
        and r.user_id = auth.uid()
    )
  );

-- All write operations are restricted to service_role (no client policies).
-- Supabase service_role bypasses RLS by default; no additional policy needed.

-- ============================================================
-- Supabase Realtime
-- ============================================================

-- Add tables to the default supabase_realtime publication so that
-- clients can subscribe to INSERT / UPDATE / DELETE events.
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table courier_locations;
