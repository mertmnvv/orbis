# Orbis Projesi - Mevcut Durum ve Özellikler Özeti

Bu doküman, Orbis projesine sonradan dahil olacak geliştiriciler (veya diğer yapay zeka asistanları) için projenin genel yapısını, kullanılan teknolojileri ve bugüne kadar geliştirilen temel özellikleri özetlemek amacıyla hazırlanmıştır.

## 1. Projenin Amacı ve Mimari Yapısı

**Orbis**, restoranların kurye takibini ve kuryelerin sipariş yönetimini sağlayan eşzamanlı (real-time) bir lojistik yönetim platformudur.
Proje "Monorepo" mantığıyla kurulmuş olup iki ana uygulamadan oluşmaktadır:

- **Web Paneli (`apps/web`):** Restoran sahiplerinin siparişleri, kuryeleri ve ayarları yönettiği Next.js tabanlı yönetim paneli. (Tailwind CSS, Lucide Icons, DnD-Kit)
- **Kurye Mobil Uygulaması (`apps/mobile`):** Kuryelerin sahadayken siparişleri kabul edip durumlarını güncellediği React Native (Expo) tabanlı mobil uygulama. (NativeWind, MapboxGL, Zustand, Turf.js)
- **Veritabanı (`supabase`):** Tüm veriler ve anlık iletişim (Realtime) Supabase üzerinden PostgreSQL kullanılarak sağlanmaktadır. (Row Level Security - RLS aktif)

---

## 2. Bugüne Kadar Tamamlanan Temel Geliştirmeler

### A. Web Paneli (Restoran Ekranı)
1. **Kanban Sipariş Panosu (`/orders`):** 
   - Tüm siparişler "Bekliyor", "Kuryede", "Teslim Edildi" gibi sütunlarda kartlar halinde listelenir.
   - Sürükle-bırak (Drag & Drop) özelliği mevcuttur ancak kuryeye atanan siparişlerin kurye tarafından onaylanması sistemi kullanıldığından manuel sürükleme kısıtlıdır.
2. **Dashboard ve Raporlar (`/dashboard`):** 
   - Günlük satış, toplam ciro, başarılı teslimat gibi metriklerin canlı olarak (sayfa yenilemeden) aktığı yönetici ekranı.
3. **Ayarlar Paneli (`/settings`):**
   - Restoran bilgileri (Çalışma saatleri vb.)
   - Entegrasyonlar (Yemeksepeti, Getir, Trendyol) için API Key alanları.
   - **Çoklu Sipariş Ayarları:** Restoranın kuryelere vereceği "Maksimum KM sınırı" ve "Maksimum Paket Sayısı" buradan ayarlanır. (Supabase `restaurants` tablosuna kaydedilir).

### B. Mobil Uygulama (Kurye Ekranı)
1. **Zustand State Yönetimi (`store/orderStore.ts`):** 
   - Tüm sipariş yönetimi, anlık senkronizasyon (Supabase Realtime) ve optimistic UI güncellemeleri bu dosyadan yönetilir.
2. **Optimistic UI (Sıfır Bekleme):** 
   - Kurye "Kabul Et", "Teslim Aldım" veya "Teslim Ettim" tuşlarına bastığında arayüz anında güncellenir. Veritabanı ve konum (GPS) güncellemeleri, kullanıcıyı bekletmemek adına arka planda (Fire-and-forget) işlenir.
3. **Gelişmiş Çoklu Sipariş (Multi-Order) Modülü (`accept-[id].tsx`):**
   - Kurye bekleyen bir siparişi "İncele" dediğinde, sistem o siparişin güzergahına (yarıçapına) uygun diğer bekleyen siparişleri bulur (Turf.js `distance` hesaplaması).
   - "Birlikte Alabileceğin Fırsatlar" olarak kuryeye listeler.
   - Harita üzerinde MapboxGL kullanılarak (Restoran -> Müşteriler) rotaları çizilir.
   - Kurye, restoranın web panelinden belirlediği **"Maks. Paket Sayısı" (örn: 3)** sınırına kadar ekstra sipariş seçip tek seferde (Toplu Kabul) üstüne alabilir. Limit dolduğunda diğer seçenekler pasif (disabled) olur.

---

## 3. Veritabanı Şeması (Önemli Tablolar)

- `restaurants`: Restoran bilgilerini, `max_multi_order_km` (float) ve `max_multi_order_count` (int) ayarlarını tutar.
- `couriers`: Kuryelerin anlık koordinatlarını ve user_id'lerini tutar.
- `orders`: Tüm siparişleri tutar. `status` (pending, assigned, picked_up, delivered), `courier_id`, müşteri koordinatları (`customer_lat`, `customer_lng`), ve özet `items` JSON verisini içerir.

---

## 4. Sonraki Adımlar (Gelecekte Yapılabilecekler)

Bir sonraki asistan/geliştirici bu projeyi devraldığında şu konulara odaklanabilir:
1. **Gerçek Entegrasyonların Bağlanması:** Şu an Getir, Trendyol vb. siparişleri Supabase'e mock olarak ekleniyor. Gerçek webhook uçlarının (endpoints) Next.js API Routes tarafında yazılması.
2. **Kurye Konum Takibi (Canlı Harita):** Kurye mobil uygulamasından 5-10 saniyede bir GPS koordinatının Supabase `couriers` tablosuna yazılması ve Web panelindeki haritada kuryelerin canlı icon olarak izlenmesi.
3. **Kurye Hakediş/Maaş Hesaplaması:** Kuryelerin taşıdığı paket sayısına ve mesafesine göre hakedişlerinin hesaplanacağı ayrı bir muhasebe paneli.

**Not:** Mobil uygulamada Harita (MapboxGL) bileşenleri Expo Go modunda çalışmadığı için Native Build (Development Build) alınması gerekmektedir. Kodlarda buna uygun `isExpoGo` fall-back (uyarı) arayüzleri mevcuttur.
