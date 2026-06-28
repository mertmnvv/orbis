# Orbis — Yapılan Değişiklikler (Claude Oturumu Özeti)

Bu döküman, bir önceki Claude oturumunda `c:\Mert\orbis` monoreposunda yapılan tüm değişiklikleri özetler. Bir sonraki AI'a bağlam vermek için hazırlanmıştır.

---

## Proje Yapısı

```
c:\Mert\orbis/
├── apps/
│   ├── mobile/          # Expo Router v3.5 + NativeWind v2 + Zustand — Kurye uygulaması
│   └── web/             # Next.js 14 + Tailwind + React Query — Restoran yönetim paneli
├── packages/
└── package.json         # npm workspaces monorepo
```

---

## 1. Tasarım Sistemi — Dark Mode (Her İki Uygulama)

### Mobile (`apps/mobile/tailwind.config.js`)
Eski `brand-*` yeşil renk skalası tamamen kaldırıldı. Yeni token'lar:

```js
colors: {
  dark: {
    base: '#0a0a0a',     // Ana arka plan
    surface: '#141414',  // Kart arka planı
    elevated: '#1e1e1e', // Hover / aktif
    border: '#2a2a2a',   // Kenarlıklar
  },
  accent: { DEFAULT: '#f97316', muted: '#431407', light: '#fed7aa' },
  mtext: { primary: '#ffffff', secondary: '#a1a1aa', muted: '#52525b' },
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
}
```

### Web (`apps/web/src/app/globals.css`)
CSS değişkenleri dark-first sisteme çevrildi. Ana renkler:
- Arka plan: `#0a0a0a`
- Surface: `#141414`
- Accent (primary): `#f97316` (turuncu)
- Border: `#2a2a2a`

`apps/web/src/app/layout.tsx` — `<html className="dark">` ve `body bg-[#0a0a0a]` eklendi.
`apps/web/src/app/(app)/layout.tsx` — arka plan `bg-[#0a0a0a]` yapıldı.

---

## 2. Login Ekranları — Yeniden Tasarım

### Web (`apps/web/src/app/login/page.tsx`)
- Tam ekran koyu arka plan
- Ortada `#141414` kart, `#2a2a2a` border
- Turuncu (`#f97316`) logo ikonu ve "Giriş Yap" butonu
- Input'lar: `#1e1e1e` bg, focus'ta turuncu border

### Mobile (`apps/mobile/app/(auth)/login.tsx`)
- Arka plan: `dark-base` (`#0a0a0a`)
- Turuncu glow'lu logo (bicycle icon)
- Telefon input: koyu, turuncu focus border
- OTP input: koyu bg, geniş letter-spacing
- `dark-surface` card içinde form

---

## 3. Mobile Ekranlar — Dark Mode

### Tab Bar (`apps/mobile/app/(app)/_layout.tsx`)
```js
tabBarActiveTintColor: "#f97316",
tabBarInactiveTintColor: "#52525b",
backgroundColor: "#141414",
borderTopColor: "#2a2a2a",
tabBarBadgeStyle: { backgroundColor: "#f97316" }
```

### Siparişler (`apps/mobile/app/(app)/index.tsx`)
- Arka plan: `dark-base`
- Header: turuncu bisiklet ikonu avatar
- Active order banner: turuncu sol border + `dark-surface`
- Boş durum: koyu arka plan
- RefreshControl: turuncu

### Aktif Sipariş (`apps/mobile/app/(app)/active.tsx`)
- Tüm kartlar: `dark-surface` bg, `dark-border` border
- Status badge'ler: inline `backgroundColor` / `color` style ile
- Route ikonları: turuncu (restoran) + mavi (müşteri)
- Butonlar: turuncu "Yemeği Teslim Aldım", yeşil "Müşteriye Teslim Ettim"
- Her iki butona `loading` state eklendi
- Mesafe/Süre kartları teslim alındıktan sonra güncellenerek gösteriliyor

### Geçmiş (`apps/mobile/app/(app)/history.tsx`)
- Kartlar: `dark-surface`
- SummaryBar: turuncu sol border, renkli sayılar
- Teslim Edildi badge: yeşil `bg-success/15`

### Harita (`apps/mobile/app/(app)/map.tsx`)
- Mapbox stili: `mapbox://styles/mapbox/dark-v11`
- Alt bilgi kartı: `dark-surface`
- **Sol üst köşe "Konumum" butonu** — turuncu `locate` ikonu
  - `expo-location` ile izin → GPS → `cameraRef.setCamera()` fly-to
  - `zoomLevel: 16`, `animationDuration: 600`
  - `cameraRef` hook'ları kuralına uygun: erken return'lerden önce tanımlandı

### OrderCard (`apps/mobile/components/OrderCard.tsx`)
- Kart: `dark-surface`, `dark-border`
- Restoran ikonu: `accent/15` bg, Müşteri ikonu: `blue-500/10` bg
- Reddet: `danger` | Kabul Et: `accent`

---

## 4. Teslim Alımında Konum + Mesafe Hesaplama

### `apps/mobile/store/orderStore.ts`
`updateOrderStatus` fonksiyonu genişletildi. `status === 'picked_up'` durumunda:

1. `Location.requestForegroundPermissionsAsync()` — izin iste
2. `Location.getCurrentPositionAsync({ accuracy: High })` — GPS al
3. Mapbox Directions API:
   ```
   GET https://api.mapbox.com/directions/v5/mapbox/driving/{lng,lat};{customerLng,customerLat}
       ?access_token=EXPO_PUBLIC_MAPBOX_TOKEN
   ```
4. `route.distance` → km string, `route.duration` → dakika string
5. `activeOrder.estimatedDistance` ve `estimatedTime` store'da güncelleniyor
6. `picked_up_lat`, `picked_up_lng` Supabase `orders` tablosuna yazılıyor

Yeni yardımcı fonksiyon:
```ts
async function fetchRouteFromCurrentLocation(
  currentLng, currentLat, destLng, destLat
): Promise<{ distance: string; duration: string } | null>
```

### `apps/mobile/types/index.ts`
`Order` interface'ine eklendi:
```ts
pickedUpLat?: number;
pickedUpLng?: number;
```

---

## 5. Web Component'lar — Dark Mode

### Sidebar (`apps/web/src/components/layout/Sidebar.tsx`)
- Arka plan: `#141414`, border: `#2a2a2a`
- Logo: turuncu `#f97316` bg
- Aktif nav: `border-l-2 border-[#f97316]`, bg `#1e1e1e`
- **Yeni "Bölgeler" nav linki** (`/zones`, `Map` icon)

### StatusBadge (`apps/web/src/components/orders/StatusBadge.tsx`)
```ts
pending:   { bg: '#78350f20', text: '#f59e0b' }
assigned:  { bg: '#1e3a5f',   text: '#60a5fa' }
picked_up: { bg: '#431407',   text: '#f97316', dot: animate-pulse }
delivered: { bg: '#14532d20', text: '#22c55e' }
cancelled: { bg: '#1c1c1c',   text: '#71717a' }
```

### OrderCard (`apps/web/src/components/orders/OrderCard.tsx`)
- `Card` bileşeni → düz `<div>` (bağımlılık azaltıldı)
- Kart: `#141414` bg, hover `#1e1e1e`, renk kodlu sol border

### OrdersBoard (`apps/web/src/components/orders/OrdersBoard.tsx`)
- Stat kartları: `#141414` bg, renkli sayılar + emoji
- Tab bar: aktif tab `border-[#f97316]` underline
- Skeleton: `#1e1e1e` bg

### CourierMap (`apps/web/src/components/map/CourierMap.tsx`)
- Mapbox stili: `dark-v11`
- Kurye pin: `#f97316` dolu / `#52525b` pasif, iç `#141414`
- Popup: `#141414` bg, `#2a2a2a` border
- **Sol üst panel:** aktif kurye listesi (isim, son görülme, aktif nokta)

---

## 6. Yeni: Bölge/Zone Yönetimi (Web)

### `apps/web/src/hooks/useZones.ts`
```ts
interface DeliveryZone {
  id: string; name: string;
  polygon: GeoJSON.Feature<GeoJSON.Polygon>;
  color: string; is_active: boolean; created_at: string;
}
const ZONE_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#f43f5e', '#06b6d4'];

useZones()        // list
useCreateZone()   // insert
useUpdateZone()   // patch (toggle, rename)
useDeleteZone()   // delete
```

### `apps/web/src/components/zones/ZonesList.tsx`
Sol panel: zone listesi, toggle (Eye/EyeOff), sil (Trash2), "+ Yeni Bölge Ekle" butonu.

### `apps/web/src/components/zones/ZoneMap.tsx`
- `mapbox://styles/mapbox/dark-v11`
- `@mapbox/mapbox-gl-draw` — polygon çizim modu (dinamik import, SSR yok)
- Çizim bittikten sonra modal: isim + 6'lı renk seçici → `useCreateZone()` ile kaydet
- Mevcut zone'lar fill + line layer

### `apps/web/src/app/(app)/zones/page.tsx`
Sol `w-64` panel (`ZonesList`) + sağ `flex-1` (`ZoneMap`, dynamic `ssr:false`).

### Gerekli Supabase Migration (henüz uygulanmadı)
```sql
CREATE TABLE delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  polygon jsonb NOT NULL,
  color text DEFAULT '#f97316',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

---

## 7. Yeni: Ayarlar Paneli (Web)

### `apps/web/src/app/(app)/settings/page.tsx`
4 bölüm, her biri `#141414` kart içinde:

1. **Restoran Bilgileri** — ad, adres, telefon, çalışma saatleri → `localStorage` + Supabase upsert
2. **Platform Entegrasyonları** — Yemeksepeti/Getir/Trendyol/Paket Taksi (salt okunur, yeşil "Aktif" badge)
3. **Bildirimler** — toggle switch'ler → `localStorage`
4. **Hesap** — email gösterimi, çıkış butonu (kırmızı border)

---

## 8. Paket Değişiklikleri

### `apps/web/package.json`
```json
"@mapbox/mapbox-gl-draw": "^1.4.3"
"@types/mapbox__mapbox-gl-draw": "^1.4.0"
```

Kurulum komutu:
```bash
npm install --workspace=apps/web --ignore-scripts
```
> `--ignore-scripts` gerekli: root `postinstall` script'i `patch-package` çalıştırıyor.

---

## Eksikler / Yapılmayı Bekleyenler

| Alan | Not |
|------|-----|
| `delivery_zones` Supabase migration | Supabase Dashboard SQL Editor'da çalıştırılmalı |
| `orders` tablosuna `picked_up_lat/lng` sütunları | `ALTER TABLE orders ADD COLUMN picked_up_lat float, ADD COLUMN picked_up_lng float;` |
| `OrderMap.tsx` dark mode | `/orders/[id]` detay sayfasındaki harita henüz dark tema almadı |
| Zone'ların CourierMap'te gösterilmesi | `delivery_zones` katmanı `CourierMap.tsx`'e eklenebilir |
| Native build testi | Konum butonu + teslim alım konum özelliği Expo Go'da çalışmaz, native build gerektirir |

---

## Kritik Dosya Listesi

```
apps/mobile/
├── tailwind.config.js
├── types/index.ts
├── store/orderStore.ts
├── app/(auth)/login.tsx
├── app/(app)/_layout.tsx
├── app/(app)/index.tsx
├── app/(app)/active.tsx
├── app/(app)/history.tsx
├── app/(app)/map.tsx               ← "Konumum" butonu sol üst
└── components/OrderCard.tsx

apps/web/src/
├── app/globals.css
├── app/layout.tsx
├── app/(app)/layout.tsx
├── app/login/page.tsx
├── app/(app)/settings/page.tsx     ← YENİ
├── app/(app)/zones/page.tsx        ← YENİ
├── components/layout/Sidebar.tsx
├── components/orders/StatusBadge.tsx
├── components/orders/OrderCard.tsx
├── components/orders/OrdersBoard.tsx
├── components/map/CourierMap.tsx
├── components/zones/ZoneMap.tsx    ← YENİ
├── components/zones/ZonesList.tsx  ← YENİ
└── hooks/useZones.ts               ← YENİ
```
