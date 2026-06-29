# Orbis — Güvenlik Mimarisi & Audit Raporu

> Son güncelleme: 2026-06-29

---

## Güvenlik Katmanları

### 1. Supabase Row Level Security (RLS)

Tüm tablolarda RLS aktif. Roller: `restoran sahibi`, `kurye`, anonim (izin yok).

| Tablo | Restoran Sahibi | Kurye | Açıklama |
|-------|----------------|-------|----------|
| `restaurants` | Kendi satırı: CRUD | Okuma (yalnızca adı, adresi) | Sahibiyet: `user_id = auth.uid()` |
| `orders` | Kendi restoranı: CRUD | Pending okuma + atandığı sipariş güncelleme | Çift policy; `courier_accept` + `courier_update_status` |
| `couriers` | — | Kendi satırı: CRUD | `user_id = auth.uid()` |
| `courier_locations` | Kendi kuryesinin lokasyonu: Okuma | Kendi lokasyonu: INSERT + Okuma | Restoran, aktif siparişi olan kuryeleri görebilir |
| `delivery_zones` | Kendi restoranına ait zone: CRUD | Aktif zone'lar: Okuma | `restaurant_id` ile sahiplik izolasyonu (017 migration) |
| `menu_items` | Kendi restoranı: CRUD | — | |
| `customers` | Kendi restoranı: CRUD | — | |

**Kritik Tasarım:** RLS politikaları sonsuz döngü oluşturmaması için; `restaurants` policy'si `orders` tablosuna bakmaz, `orders` policy'si `restaurants` tablosuna bakabilir.

---

### 2. Next.js Middleware (Server-Side Route Protection)

**Dosya:** [apps/web/middleware.ts](apps/web/middleware.ts)

- Her istek sunucu tarafında Supabase session kontrolünden geçer
- Session yoksa `/login?next=<path>` yönlendirilir
- Token rotation otomatik yapılır (`@supabase/ssr`)
- Public paths: `/login`, `/api/directions`

**Önceki durum (açık):** Sadece `AuthProvider` ile client-side kontrol; kullanıcı brief olarak protected sayfaları görebiliyordu.

---

### 3. API Proxy — Harici Servisler

**Mapbox Directions API:**
- **Önceki:** `EXPO_PUBLIC_MAPBOX_TOKEN` mobile tarafında açıkta, API doğrudan çağrılıyordu
- **Sonraki:** Token `MAPBOX_SECRET_TOKEN` adıyla sunucu ortam değişkeninde saklanır
- Proxy: [apps/web/src/app/api/directions/route.ts](apps/web/src/app/api/directions/route.ts)
- Input validation: Zod `DirectionsQuerySchema`
- Mobile erişim: `EXPO_PUBLIC_API_BASE_URL/api/directions`

**Mapbox harita render token:**
- `EXPO_PUBLIC_MAPBOX_TOKEN` — Yalnızca `map:read` scope'una kısıtlanmalı (Mapbox dashboard)
- Routing API erişimi server proxy'de, bu token sadece tile görüntüleme için

---

### 4. Runtime Validation — Zod

**Paket:** [packages/validators/src/](packages/validators/src/)

| Schema | Kullanım |
|--------|----------|
| `OrderRowSchema` | Supabase'den gelen order satırlarını validate eder |
| `OrderWithCourierSchema` | `useOrders` hook çıktısını validate eder |
| `SplitPaymentNotesSchema` | `payment_notes` JSON parse güvenliği |
| `CreateOrderSchema` | Yeni sipariş oluşturma input'u |
| `DeliveryZoneSchema` | Zone polygon yapısını validate eder |
| `DirectionsQuerySchema` | `/api/directions` input validation |

**Önceki açıklar:**
- `payment_notes` → raw `JSON.parse()` (exception catch yoktu, parsed.split doğrudan erişiliyordu)
- `payload.new as any` realtime handler'larında
- Supabase çıktısı tip cast ile doğrudan kullanılıyordu

---

### 5. Ortam Değişkenleri Güvenliği

| Değişken | Kapsam | Açıklama |
|----------|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Web client | Herkese açık, anon key ile kullanılır |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web client | Herkese açık, RLS ile korunur |
| `MAPBOX_SECRET_TOKEN` | Web server-only | `NEXT_PUBLIC_` prefix'i YOK — client'a sızmaz |
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile client | |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mobile client | |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Mobile client | Yalnızca map:read scope'u olmalı |
| `EXPO_PUBLIC_API_BASE_URL` | Mobile client | Web API proxy base URL |

---

### 6. Geliştirme Bypass Güvenliği (authStore)

`apps/mobile/store/authStore.ts` içinde `__DEV__` bypass mevcut:
- Hardcoded email: `devtest@orbiscourier.com`
- Bu kod `__DEV__` guard'ı ile production build'lerde derlenmez
- **Öneri:** Bu kullanıcının production Supabase'de olmadığını doğrula; staging-only kullanıcı olarak işaretle

---

## Eksik / Yapılacak

- [ ] Mapbox token'ını Mapbox dashboard'dan `map:read`-only scope'a kısıtla
- [ ] `EXPO_PUBLIC_API_BASE_URL` production değerini `.env.production`'a ekle  
- [ ] `devtest@orbiscourier.com` kullanıcısının production Supabase'de olmadığını doğrula
- [ ] Rate limiting: `/api/directions` endpoint'ine istek limiti ekle (Vercel Edge Config veya Upstash)
- [ ] CSP Header: `next.config.js`'e Content Security Policy ekle

---

## Güvenlik Mimarisi Diyagramı

```
┌─────────────────────────────────────────────────────────────┐
│  Mobile App (Expo)                                          │
│  ├── Supabase Auth (OTP/SMS) → JWT token                    │
│  ├── Supabase Client (anon key + JWT) → RLS filtreler       │
│  └── /api/directions → Web Proxy → Mapbox (server token)    │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  Next.js Web Dashboard                                      │
│  ├── middleware.ts → Server session check → Redirect        │
│  ├── Supabase SSR Client (cookie-based session)             │
│  ├── Supabase Client (anon key + JWT) → RLS filtreler       │
│  └── /api/directions (Edge Function) → Mapbox (server token)│
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  Supabase Backend                                           │
│  ├── RLS: Her tablo izole (kullanıcı sadece kendi verisini) │
│  ├── Auth: JWT doğrulama her sorguda                        │
│  └── Realtime: RLS ile filtrelenmiş event'lar              │
└─────────────────────────────────────────────────────────────┘
```
