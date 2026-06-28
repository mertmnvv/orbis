# Mapbox Entegrasyonu — Durum & Devam Rehberi

## Ne Yapıldı

### Paket Değişiklikleri

**Web (`apps/web`):**
- `@react-google-maps/api` kaldırıldı
- `react-map-gl@^7.1.7` + `mapbox-gl@^2.15.0` eklendi

**Mobil (`apps/mobile`):**
- `react-native-maps` kaldırıldı
- `@rnmapbox/maps@~10.1.45` eklendi (10.1.x serisi: RN 0.74 uyumlu; 10.3.x RN 0.79 gerektirir)

---

### Değişen Dosyalar

| Dosya | Ne Değişti |
|---|---|
| `apps/web/src/components/map/CourierMap.tsx` | Google Maps → Mapbox (`react-map-gl`), kurye marker + popup |
| `apps/web/src/components/map/OrderMap.tsx` | Google Maps → Mapbox, rota GeoJSON `Source` + `LineLayer` |
| `apps/web/src/app/globals.css` | `@import 'mapbox-gl/dist/mapbox-gl.css'` eklendi |
| `apps/mobile/app/(app)/map.tsx` | `react-native-maps` → `@rnmapbox/maps`, `PointAnnotation` + `ShapeSource` |
| `apps/mobile/metro.config.js` | `@rnmapbox/maps` resolver fix (TypeScript source → `lib/commonjs`) |
| `apps/mobile/app.json` | `@rnmapbox/maps` plugin eklendi (`RNMapboxMapsDownloadToken`) |
| `apps/web/.env.example` / `.env.local` | `NEXT_PUBLIC_MAPBOX_TOKEN` |
| `apps/mobile/.env.example` / `.env.local` | `EXPO_PUBLIC_MAPBOX_TOKEN` + `MAPBOX_SECRET_TOKEN` |

---

### Metro Resolver Fix (Önemli)

`@rnmapbox/maps` paketinin `react-native` field'ı TypeScript source'a (`src/`) işaret eder.
Metro bu source'u bundle'lamaya çalışırken `./components/Camera` import'unu çözemiyor.

`apps/mobile/metro.config.js`'e eklenen fix:

```js
if (moduleName === "@rnmapbox/maps") {
  return {
    type: "sourceFile",
    filePath: require.resolve("@rnmapbox/maps/lib/commonjs/index"),
  };
}
```

Bu fix olmadan Expo Go'da **500 bundle error** alınır.

---

## Token Durumu

| Token | Değer | Nerede |
|---|---|---|
| Public token (`pk.xxx`) | ✅ Girildi | `apps/web/.env.local`, `apps/mobile/.env.local` |
| Secret token (`sk.xxx`) | ❌ Eksik | `apps/mobile/.env.local` → `MAPBOX_SECRET_TOKEN` |

Secret token nereden alınır:
1. [mapbox.com](https://mapbox.com) → Account → Tokens
2. **Create a token** → Scope: `downloads:read` seç
3. `apps/mobile/.env.local` dosyasına yaz:
   ```
   MAPBOX_SECRET_TOKEN=sk.eyJ...
   ```

Secret token **sadece native build sırasında** (`npx expo run:android`) Mapbox SDK'yı Maven/CocoaPods'dan indirmek için gereklidir. Expo Go'da gerekmiyor.

---

## Çalıştırma

### Web
```bash
npm run web        # localhost:3000
```
Supabase hesabıyla giriş → kurye haritası Mapbox ile yüklenir.

### Mobil — Expo Go (harita yok, koordinat fallback)
```bash
cd apps/mobile
npx expo start --clear
```
Expo Go, `@rnmapbox/maps` native modüllerini içermez. Harita sekmesi yerine koordinat kartı gösterilir — bu beklenen davranış.

### Mobil — Dev Build (gerçek harita)
Secret token girildikten sonra:
```bash
cd apps/mobile
npx expo run:android   # veya run:ios
```
İlk build ~5-10 dk sürer (Mapbox SDK indirir). Sonraki buildler hızlı.

---

## Mimari Notlar

### Web harita bileşenleri

**`CourierMap`** (`apps/web/src/components/map/CourierMap.tsx`):
- `NEXT_PUBLIC_MAPBOX_TOKEN` yoksa → liste fallback
- Supabase Realtime'dan gelen kurye konumları → `Marker` bileşeni ile haritada
- Marker'a tıklayınca `Popup` (isim, son görülme, koordinat)

**`OrderMap`** (`apps/web/src/components/map/OrderMap.tsx`):
- Restoran (turuncu R), müşteri (mavi M), kurye (yeşil) marker'ları
- Kurye rota geçmişi → GeoJSON `Source` + `LineLayer` (turuncu çizgi)
- Alt bar: rota noktası sayısı, kurye adı, tahmini mesafe

### Mobil harita (`apps/mobile/app/(app)/map.tsx`)
- `Constants.appOwnership === "expo"` ile Expo Go tespiti
- `@rnmapbox/maps` dynamic `require()` ile yüklenir (bundle hatasını önler)
- Native build'de: `MapView` + `Camera` + `PointAnnotation` (R/M) + `ShapeSource/LineLayer` (rota)
- Koordinatlar GeoJSON sırasında: `[longitude, latitude]` (lat/lng değil!)

---

## Kalan İşler

- [ ] `MAPBOX_SECRET_TOKEN` al ve `.env.local`'e ekle
- [ ] `npx expo run:android` ile ilk native build
- [ ] Web'de Supabase auth kullanıcısı oluştur (dashboard erişimi için)
- [ ] Gerçek Supabase verisiyle kurye konumu testi
