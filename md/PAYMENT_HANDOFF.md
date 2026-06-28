# Orbis — Kurye Ödeme Tahsilat Sistemi: Handoff

Bu doküman, ödeme tahsilat özelliğini tasarlayıp hayata geçiren oturumun tam özetidir.
Projeye yeni dahil olan bir yapay zeka bu dosyayı okuyarak kaldığı yerden devam edebilir.

---

## Projeye Genel Bakış

**Orbis**, restoran + kurye lojistik platformudur.

| Uygulama | Teknoloji | Klasör |
|---|---|---|
| Restoran Web Paneli | Next.js 14 + Tailwind + React Query | `apps/web/` |
| Kurye Mobil | Expo Router v3.5 + Zustand + NativeWind | `apps/mobile/` |
| Backend | Supabase (PostgreSQL + Realtime + RLS) | `supabase/` |

Temel tipler: `apps/web/src/lib/types.ts` ve `apps/mobile/types/index.ts`
Kurye store: `apps/mobile/store/orderStore.ts` (Zustand, optimistic updates)

---

## Bu Oturumda Ne Yapıldı

### Problem
Yemek Sepeti, Trendyol, Getir ve telefon siparişlerinde ödeme bilgisi hiç takip edilmiyordu.
Kurye kapıda nakit/kart tahsil etse bile sisteme işleyemiyordu. Restoran hangi ödemelerin alındığını bilemiyordu.

### Çözüm Özeti
3 ödeme yöntemi: `cash` (nakit), `card` (kart), `online_paid` (platform üzerinden ödenmiş)
4 ödeme durumu: `not_required` | `pending` | `collected` | `failed`

Platform siparişleri (YS/Trendyol/Getir) → varsayılan `online_paid` + `not_required`
Manuel/telefon siparişleri → varsayılan `cash` + `pending`

---

## Değiştirilen / Eklenen Dosyalar

### 1. `supabase/migrations/014_add_payment_fields.sql` ✅ UYGULANMIŞ
```sql
ALTER TABLE orders
  ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'card', 'online_paid')),
  ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('not_required', 'pending', 'collected', 'failed')),
  ADD COLUMN payment_collected_at TIMESTAMPTZ,
  ADD COLUMN payment_notes TEXT;
```
Migration MCP üzerinden uygulandı (`apply_migration` — başarılı).

---

### 2. TypeScript Tipleri

**`apps/web/src/lib/types.ts`**
```typescript
export type PaymentMethod = 'cash' | 'card' | 'online_paid';
export type PaymentStatus = 'not_required' | 'pending' | 'collected' | 'failed';

// Order interface'e eklendi:
payment_method: PaymentMethod;
payment_status: PaymentStatus;
payment_collected_at?: string | null;
payment_notes?: string | null;
```

**`apps/mobile/types/index.ts`**
```typescript
export type PaymentMethod = "cash" | "card" | "online_paid";
export type PaymentStatus = "not_required" | "pending" | "collected" | "failed";

// Order interface'e eklendi (camelCase):
paymentMethod: PaymentMethod;
paymentStatus: PaymentStatus;
paymentCollectedAt?: string | null;
```

---

### 3. `apps/mobile/store/orderStore.ts`

**`mapRow()` fonksiyonuna eklendi:**
```typescript
paymentMethod: row.payment_method ?? "cash",
paymentStatus: row.payment_status ?? "pending",
paymentCollectedAt: row.payment_collected_at ?? null,
```

**Yeni `recordPayment()` fonksiyonu eklendi (store interface + impl):**
```typescript
async recordPayment(orderId: string, collected: boolean) {
  const status: PaymentStatus = collected ? "collected" : "failed";
  await supabase.from("orders").update({
    payment_status: status,
    payment_collected_at: collected ? new Date().toISOString() : null,
  }).eq("id", orderId);
  // Zustand state'i de günceller
}
```

---

### 4. `apps/mobile/app/(app)/active.tsx`

Eklenen bileşenler:
- **`PaymentBadge`**: Her aktif sipariş kartında "NAKİT 284,90 ₺" / "KART 156,50 ₺" / "ONLINE ÖDENMİŞ" badge'i gösterir
- **`PaymentModal`**: Kurye "Müşteriye Teslim Ettim" dediğinde, `paymentStatus === "pending"` ise modal açılır:
  - "Evet, Aldım" → `payment_status: collected`
  - "Hayır, Alamadım" → `payment_status: failed`
  - Her iki durumda sipariş `delivered` olur
  - `online_paid` ise modal çıkmaz, direkt teslim edildi

**Performans düzeltmesi:** `handleDelivered` içinde `recordPayment` ve `updateOrderStatus` artık `Promise.all` ile paralel çalışıyor. `updateOrderStatus`'un senkron optimistic update'i anında UI'yi güncelliyor; DB yazmaları arka planda eş zamanlı gidiyor.
```typescript
await Promise.all([
  collected !== undefined ? recordPayment(order.id, collected) : Promise.resolve(),
  updateOrderStatus(order.id, "delivered"),
]);
```

---

### 5. `apps/web/src/app/(app)/orders/new/page.tsx`

Telefon siparişi oluştururken ödeme yöntemi seçici eklendi (3'lü buton grubu):
- Nakit (Banknote ikonu, sarı)
- Kart (CreditCard ikonu, mavi)
- Online (Wifi ikonu, yeşil)

`handleSubmit` içinde:
```typescript
payment_method: paymentMethod,
payment_status: paymentMethod === 'online_paid' ? 'not_required' : 'pending',
```

---

### 6. `apps/web/src/components/orders/OrderCard.tsx`

Her sipariş kartının footer'ında tutar yanına `PaymentStatusBadge` eklendi:
- `not_required` → yeşil "Online Ödenmiş"
- `pending` → sarı "Tahsilat Bekliyor"
- `collected` → yeşil "Tahsil Edildi"
- `failed` → kırmızı "Tahsilat Yapılamadı"

---

### 7. `apps/web/src/app/(app)/orders/[id]/page.tsx`

Sol panele "Ödeme" bölümü eklendi:
- Ödeme yöntemi (ikon + label)
- Tahsilat durumu (renkli)
- `payment_collected_at` zamanı (varsa)
- `failed` durumunda kırmızı uyarı kartı

---

### 8. `apps/web/src/lib/mock-data.ts`

`mockOrders` içindeki 8 siparişe `payment_method` + `payment_status` alanları eklendi.
Örnek: YS/Trendyol/Getir → `online_paid` + `not_required`; manual → `cash` + `pending`/`collected`

---

## Bilinen Sorunlar / Devam Edilecekler

### Henüz Yapılmayanlar

1. **Platform entegrasyonu otomatik ödeme yöntemi:**
   Platform API'den gelen siparişlerde (YS, Trendyol, Getir) "kapıda ödeme" seçeneği varsa `payment_method` otomatik `cash` set edilmeli. Şu an her zaman `online_paid` yazıyor.
   → `apps/web/src/app/(app)/orders/new/page.tsx` içinde platform değerine göre varsayılan zaten var; platform entegrasyon webhook'u yapılacaksa orada da `payment_method` set edilmeli.

2. **Dashboard'da ödeme metrikleri:**
   "Bugün tahsil edilen nakit" / "Tahsilatı bekleyen sipariş sayısı" gibi metrikler `apps/web/src/app/(app)/dashboard/page.tsx`'e eklenebilir.
   Query: `SELECT payment_method, payment_status, SUM(total_amount) FROM orders WHERE ...`

3. **`payment_notes` kullanımı:**
   Kolon DB'de var ama UI'de kullanılmıyor. Kurye "Hayır, Alamadım" diyince gerekçe yazabilmeli.

4. **`apps/web/src/app/(app)/orders/page.tsx` — Sipariş listesi filtresi:**
   "Tahsilat Bekleyenler" filtresi eklenebilir.
   (`payment_status = 'pending'` ve `status = 'delivered'`)

5. **`apps/mobile/app/(app)/history.tsx` — Geçmiş ödeme gösterimi:**
   Geçmiş siparişlerde ödeme durumu/yöntemi badge'i yok. `apps/mobile/app/(app)/history.tsx` güncellenmeli.

---

## Veritabanı Şeması (Güncel)

```sql
-- orders tablosunda ödeme kolonları (migration uygulandı):
payment_method        TEXT  NOT NULL DEFAULT 'cash'
                      CHECK IN ('cash', 'card', 'online_paid')
payment_status        TEXT  NOT NULL DEFAULT 'pending'
                      CHECK IN ('not_required', 'pending', 'collected', 'failed')
payment_collected_at  TIMESTAMPTZ  -- kurye tahsil ettiğinde yazılır
payment_notes         TEXT         -- opsiyonel not
```

**Mevcut migration listesi (DB'de kayıtlı):**
- 006_restaurant_management
- 008_add_courier_availability
- 009_courier_restaurant_association
- 010_fix_rls_recursion
- fix_dev_test_courier_restaurant
- release_courier_rpc
- 013_fix_courier_duplicates_and_devtest_link
- **add_payment_fields** ← bu oturumda eklendi ✅

---

## Kurye Teslimat Akışı (Güncel)

```
Sipariş Oluşturma (Web)
  ↓  payment_method seçilir → payment_status otomatik set edilir
  ↓
Kurye Sipariş Kabul
  ↓  status: pending → assigned
  ↓
Kurye Restorana Gider
  ↓  "Yemeği Teslim Aldım" → status: picked_up
  ↓
Kurye Müşteriye Gider
  ↓  "Müşteriye Teslim Ettim" basılır
     ├─ paymentStatus === 'pending' (cash/card)
     │   └─ Modal: "Ödemeyi aldınız mı?"
     │       ├─ "Evet, Aldım"       → recordPayment(collected) + updateOrderStatus(delivered)
     │       └─ "Hayır, Alamadım"   → recordPayment(failed)   + updateOrderStatus(delivered)
     └─ paymentStatus === 'not_required' (online_paid)
         └─ Direkt updateOrderStatus(delivered) — modal yok
```

---

## Kritik Notlar

- `recordPayment` DB'ye yazar ama `payment_status` store state'ini de günceller (Zustand `set`).
- `updateOrderStatus("delivered")` optimistic update yapıyor — sipariş anında aktif listeden kalkıyor.
- Bu ikisi `Promise.all` ile paralel çalışıyor → gecikme yok.
- RLS politikaları kurye'nin sadece kendi siparişlerini güncellemesine izin veriyor; `payment_collected_at` yazmak için ek RLS policy gerekmeyebilir ama test edilmeli.
