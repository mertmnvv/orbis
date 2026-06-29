# Faz 5: İleri Düzey Analitik ve Entegrasyonlar

Bu faz, veri analizi ve stok yönetimi ile restoranın karar verme süreçlerini iyileştirir.

## 5.1 Isı Haritası ve Gecikme Analizleri
- **Hedef:** Web dashboard üzerinde performans grafiklerinin görselleştirilmesi.
- **İşlev:** 
  - **Isı Haritası (Heatmap):** Geçmiş siparişlerin müşteri koordinatları üzerinden, yoğun sipariş alan bölgelerin haritada kırmızı/sıcak renklerle gösterilmesi.
  - **Gecikme Analizi:** Mutfakta geçen süre ile kuryede geçen sürelerin ayrıştırılması ve gecikme sebeplerinin dashboard grafiklerinde (Chart.js / Recharts) listelenmesi.

## 5.2 Stok Takibi (Inventory Tracking)
- **Hedef:** Menü ürünleri için miktar (stok) takibi yapılması.
- **İşlev:** `MenuItem` tablosuna `stock_count` (integer) eklenmesi. Sipariş geldiğinde bu sayının düşmesi ve `0` olduğunda `is_available` bayrağının otomatik `false` yapılması.

## 5.3 Sipariş Kaynağı Entegrasyonu (Webhook İstasyonu)
- **Hedef:** Yemeksepeti, Getir gibi dış platformlardan gelen siparişlerin direkt Orbis'e aktarılması.
- **İşlev:** Sisteme standart bir Webhook Endpoint eklenmesi. Harici bir servisten POST isteği geldiğinde veritabanına otomatik `Order` kaydı açılması.
