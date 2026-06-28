# Supabase Entegrasyonu

## 1. MCP & Altyapı Kurulumu

- Supabase MCP server proje config'ine eklendi (`.mcp.json`)
- Supabase Agent Skills yüklendi (`supabase` + `supabase-postgres-best-practices`)
- Twilio phone auth yapılandırıldı (Account SID + Auth Token + Messaging Service SID)

## 2. Veritabanı Schema

`001_initial_schema.sql` + ek kolonlar Supabase SQL Editor'den uygulandı.

### Tablolar
| Tablo | Açıklama |
|---|---|
| `restaurants` | Restoran bilgileri (user_id ile sahip bağlantısı) |
| `couriers` | Kurye profilleri, konum, araç tipi |
| `orders` | Siparişler — platform, müşteri, durum, items |
| `courier_locations` | Append-only konum geçmişi |
| `platform_webhooks` | Yemeksepeti/Getir/Trendyol ham payload'ları |

### Enum Tipleri
- `platform_type`: yemeksepeti, getir, trendyol, pakettaksi, manual
- `order_status`: pending → assigned → picked_up → delivered / cancelled
- `vehicle_type`: bicycle, motorcycle, car, scooter, on_foot

### Eklenen Kolonlar (002)
```sql
alter table orders
  add column customer_phone text,
  add column items jsonb not null default '[]';
```

### RLS Policies
- Restaurant owner: kendi restoranının tüm siparişlerini yönetir
- Courier (self): kendi profilini okur/günceller
- Courier (pending): aktif kuryeler tüm `pending` siparişleri görür
- Courier (assigned): atandığı siparişleri okur, status günceller
- Realtime: `orders` ve `courier_locations` tabloları yayına açıldı

## 3. Mobil Uygulama Değişiklikleri

### `types/index.ts`
`OrderStatus` DB schema ile eşleştirildi:
```
accepted  →  assigned
rejected  →  cancelled
```

### `store/authStore.ts`
Mock kaldırıldı → Supabase Phone OTP auth:
- `sendOtp`: `+90` prefix otomatik eklenerek Supabase'e gönderilir
- `verifyOtp`: SMS kodu doğrulanır, session açılır
- `initialize`: AsyncStorage'dan session restore edilir, `onAuthStateChange` dinlenir

### `store/orderStore.ts`
Mock kaldırıldı → Gerçek Supabase sorguları:
- `fetchAvailableOrders`: `pending` siparişler + restaurant JOIN
- `acceptOrder`: courier kaydı bulunur, `status = 'assigned'` güncellenir
- `updateOrderStatus`: `picked_up` / `delivered` + timestamp güncellenir
- `fetchHistory`: kurye'nin teslim ettiği siparişler

### `app/(app)/active.tsx`
Status label ve renk map'i güncellendi (`accepted→assigned`, `rejected→cancelled`).

## 4. Web Uygulama Değişiklikleri

### `hooks/useOrders.ts`
Mock kaldırıldı → Gerçek Supabase:
- `fetchOrders`: orders + courier JOIN, `created_at DESC`
- `useRealtimeOrders`: `postgres_changes` subscription, toast bildirimleri

`useCourierRealtime.ts` ve `useRouteHistory.ts` zaten `IS_MOCK` toggle'ı içeriyordu — env var set olduğu için otomatik gerçek Supabase'e geçti.

## 5. Android Build Düzeltmeleri

| Sorun | Çözüm |
|---|---|
| New Architecture / Bridgeless mode crash | `app.json` → `newArchEnabled: false` + prebuild --clean |
| No Java compiler | `JAVA_HOME` = Android Studio JBR (JDK 21) |
| SDK location not found | `android/local.properties` → `sdk.dir` oluşturuldu |

## 6. Test Verisi

Supabase SQL Editor'den:
```sql
-- Restoran + pending sipariş
with usr as (select id from auth.users limit 1),
rest as (
  insert into restaurants (user_id, name, address, lat, lng, phone)
  select id, 'Burger Palace', '...', 41.0369, 28.8561, '...' from usr
  returning id
)
insert into orders (...) select rest.id, 'yemeksepeti', ... from rest;

-- Test kurye kaydı
insert into couriers (user_id, name, phone, vehicle_type, is_active)
select id, 'Test Kurye', '905550000000', 'motorcycle', true
from auth.users limit 1;
```

### Test Girişi (SMS olmadan)
Supabase Dashboard → Authentication → Phone → Test phone numbers:
```
905550000000=123456
```
