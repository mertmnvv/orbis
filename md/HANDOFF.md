# Handoff — Orbis Kurye Paneli & Mobil Düzeltmeler

Bir önceki AI bu konuşmada analizi tamamladı ama uygulamayı yazmadan durmak zorunda kaldı. Bu dosyayı oku ve aşağıdaki 4 değişikliği sırayla uygula.

---

## Bağlam: Ne isteniyor?

1. **Mobil "Unmatched Route" hatasını düzelt** — Sipariş kabul ekranına gidince `orbis:///(app)/accept-<uuid>` hatası çıkıyor.
2. **Web masaüstüne Kuryeler paneli ekle** — Aktif/pasif kuryeleri göster, isimlerini düzenle.
3. **Mobil kurye "Müsait" toggle** — Kurye müsait değilse ona sipariş düşmesin.

---

## Analiz Sonuçları (tekrar araştırma yapma)

### Supabase — `couriers` tablosu
| Sütun | Tip | Not |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | auth.users FK |
| name | text | |
| phone | text | |
| vehicle_type | enum | bicycle/motorcycle/car/scooter/on_foot |
| **is_active** | boolean | Admin tarafından aktif/pasif |
| current_lat/lng | numeric | nullable |
| fcm_token | text | nullable |
| last_seen_at | timestamptz | nullable |
| created_at | timestamptz | |

> `is_available` sütunu **yok** — migration ile eklenmesi gerekiyor.

### Kilit dosyalar
| Dosya | Sorun / Görev |
|---|---|
| `apps/mobile/app/(app)/_layout.tsx:34` | `name="accept-[id]"` yanlış → `name="accept/[id]"` olmalı |
| `apps/mobile/app/(app)/accept/[id].tsx` | Ekran hazır, sadece route bozuk |
| `apps/mobile/app/(app)/index.tsx:74` | `router.navigate('/(app)/accept/${orderId}')` — doğru |
| `apps/mobile/store/orderStore.ts` | `fetchAvailableOrders` → müsait değilse fetch yapma |
| `apps/mobile/store/authStore.ts` | Buraya veya ayrı hook'a `is_available` state ekle |
| `apps/web/src/app/(app)/couriers/page.tsx` | Kurye listesi paneli ile tamamen değiştirilecek |
| `apps/web/src/components/map/CourierMap.tsx` | Silinebilir veya bırakılabilir (artık kullanılmayacak) |

---

## Yapılacaklar (sırayla)

### 1. DB Migration — `is_available` ekle

`supabase/migrations/008_add_courier_availability.sql` dosyası oluştur:

```sql
ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;

-- Kuryenin kendi availability'sini güncelleyebilmesi için RLS policy
CREATE POLICY "couriers_update_own_availability"
  ON public.couriers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

Supabase MCP ile uygula: `mcp__supabase__apply_migration`

---

### 2. Mobil — Route Düzeltmesi

**`apps/mobile/app/(app)/_layout.tsx` satır 34:**

```tsx
// ESKİ (yanlış):
<Tabs.Screen
  name="accept-[id]"
  options={{ href: null }}
/>

// YENİ (doğru — klasör/dosya yolu ile eşleşmeli):
<Tabs.Screen
  name="accept/[id]"
  options={{ href: null }}
/>
```

---

### 3. Mobil — Müsait Toggle

#### 3a. `apps/mobile/store/authStore.ts` — `isAvailable` state ekle

`AuthState` interface'ine ve store'a şunları ekle:

```typescript
// Interface'e:
isAvailable: boolean;
toggleAvailability: () => Promise<void>;

// Store'a (create içinde):
isAvailable: true,

toggleAvailability: async () => {
  const currentVal = get().isAvailable;
  const newVal = !currentVal;
  set({ isAvailable: newVal });

  // Supabase'de güncelle
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('couriers')
    .update({ is_available: newVal })
    .eq('user_id', user.id);
},
```

`initialize` fonksiyonunda başlangıç değerini DB'den oku:

```typescript
// Session varsa couriers tablosundan is_available çek:
const { data: courier } = await supabase
  .from('couriers')
  .select('is_available')
  .eq('user_id', session.user.id)
  .single();

set({
  user: { ... },
  isAvailable: courier?.is_available ?? true,
  isLoading: false,
});
```

#### 3b. `apps/mobile/store/orderStore.ts` — Müsait değilse fetch yapma

`fetchAvailableOrders`'ın başına ekle:

```typescript
fetchAvailableOrders: async () => {
  // Müsait değilse boş döndür
  const { isAvailable } = useAuthStore.getState();
  if (!isAvailable) {
    set({ availableOrders: [], isLoadingOrders: false });
    return;
  }
  // ... geri kalan kod aynı
```

> Not: `useAuthStore` import'u `orderStore.ts`'e ekle:
> `import { useAuthStore } from './authStore';`

#### 3c. `apps/mobile/app/(app)/index.tsx` — Toggle butonu

Header'daki çıkış butonunun yanına toggle ekle. `useAuthStore`'dan `isAvailable` ve `toggleAvailability` al:

```tsx
const { user, signOut, isAvailable, toggleAvailability } = useAuthStore();
```

Header'da avatar ile logout arasına:

```tsx
{/* Müsait Toggle */}
<Pressable
  onPress={toggleAvailability}
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: isAvailable
      ? 'rgba(16,185,129,0.12)'
      : 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: isAvailable
      ? 'rgba(16,185,129,0.3)'
      : 'rgba(255,255,255,0.07)',
  }}
>
  <View style={{
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: isAvailable ? '#10b981' : '#3f3f46',
  }} />
  <Text style={{
    color: isAvailable ? '#10b981' : '#52525b',
    fontSize: 12,
    fontWeight: '700',
  }}>
    {isAvailable ? 'Müsaitim' : 'Müsait Değil'}
  </Text>
</Pressable>
```

Müsait değilken order listesi yerine boş bir state göster:

```tsx
{!isAvailable && (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name="pause-circle-outline" size={48} color="#3f3f46" />
    <Text style={{ color: '#52525b', fontWeight: '600', fontSize: 15, marginTop: 16 }}>
      Şu an müsait değilsiniz
    </Text>
    <Text style={{ color: '#2a2a2a', fontSize: 13, marginTop: 4 }}>
      Sipariş almak için "Müsait Değil" butonuna basın
    </Text>
  </View>
)}
```

---

### 4. Web — Kuryeler Paneli

`apps/web/src/app/(app)/couriers/page.tsx` dosyasını tamamen yeniden yaz. `CourierMap`'i kaldır, yeni bir client component olan `CouriersPanel` ekle.

**`apps/web/src/components/couriers/CouriersPanel.tsx`** oluştur (client component):

- Supabase'den `couriers` tablosunu çek (tüm sütunlar + `is_available`)
- Realtime subscription ile `is_available` ve `last_seen_at` değişimlerini izle
- Her kurye için:
  - **İsim**: inline editable (tıkla → input görün → blur/enter → `UPDATE couriers SET name = ? WHERE id = ?`)
  - **Durum badge**: `is_available` → yeşil "Müsait" / gri "Offline"
  - **Aktif badge**: `is_active` → turuncu "Aktif" / gri "Pasif" (admin toggle)
  - **Son görülme**: `last_seen_at` formatlanmış
  - **Araç tipi**: ikon ile (motosiklet, bisiklet vs.)
- `is_active` toggle butonu (admin kurye hesabını devre dışı bırakabilir)

**`apps/web/src/app/(app)/couriers/page.tsx`** yeni hali:

```tsx
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

export const metadata: Metadata = { title: 'Kuryeler — Orbis' };

const CouriersPanel = dynamic(
  () => import('@/components/couriers/CouriersPanel').then((m) => m.CouriersPanel),
  { ssr: false }
);

export default function CouriersPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#2a2a2a] bg-[#121212] px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Kuryeler</h1>
          <p className="mt-0.5 text-sm text-[#a1a1aa]">
            Tüm kuryelerin durumu ve yönetimi
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <CouriersPanel />
      </div>
    </div>
  );
}
```

`CouriersPanel` renk teması diğer sayfalarla tutarlı olsun: arka plan `#121212` / `#1a1a1a`, border `#2a2a2a`, text `#ffffff` / `#a1a1aa`, accent `#f97316` (turuncu).

---

## Kontrol Listesi

- [ ] Migration uygulandı (`is_available` sütunu eklendi)
- [ ] `_layout.tsx` → `accept-[id]` → `accept/[id]` düzeltildi
- [ ] `authStore.ts` → `isAvailable` + `toggleAvailability` eklendi
- [ ] `orderStore.ts` → müsait değilse fetch yapma eklendi
- [ ] `index.tsx` → toggle butonu + offline state eklendi
- [ ] `CouriersPanel.tsx` oluşturuldu (liste + inline edit + toggle)
- [ ] `couriers/page.tsx` güncellendi

---

## Önemli Notlar

- Proje monorepo: `apps/mobile` (Expo Router v3.5 + Zustand + NativeWind v2), `apps/web` (Next.js + Tailwind)
- Supabase MCP araçları mevcut — migration için `mcp__supabase__apply_migration` kullan
- Mobil NativeWind className'leri çalışıyor ama bazı yerlerde inline style tercih ediliyor (tutarlı ol)
- `useAuthStore` circular import yaratmaması için `orderStore`'da `useAuthStore.getState()` kullan (hook değil)
- Web'de tüm Supabase işlemleri `@/lib/supabase` üzerinden (web'in kendi supabase client'ı)
