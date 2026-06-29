# Faz 3: Müşteri Deneyimi (Takip Linki & Puanlama)

Bu faz, restoranın müşterisine sunduğu şeffaflığı ve kaliteyi artırarak profesyonel bir teslimat deneyimi sunar. **Önemli: Bu iki özellik web tarafında "Ayarlar (Settings)" sayfasından açılıp kapatılabilir (toggle) olmalıdır.**

## 3.1 Canlı Sipariş Takip Linki (Customer Tracking Link)
- **Hedef:** Müşterilerin siparişin nerede olduğunu haritada görebileceği herkese açık (public) bir sayfa.
- **İşlev:** Sipariş durumundayken benzersiz bir URL oluşturulur (örn. `/track/[order_id]`). Bu sayfada, `CourierLocation` tablosu dinlenerek kuryenin canlı konumu harita üzerinde (Mapbox veya Google Maps) gösterilir. (Sipariş "teslim edildi" olduğunda konum takibi sonlandırılır).

## 3.2 Müşteri Değerlendirme Sistemi (Rating System)
- **Hedef:** Teslimat sonrası müşteriden geri bildirim toplanması.
- **İşlev:** Teslimat tamamlandıktan sonra müşteriye SMS/WP üzerinden giden aynı takip linki bir "Değerlendirme Ekranı"na dönüşür. Müşteri 1-5 yıldız arasında bir değerlendirme ve yorum bırakabilir. Bu veriler veritabanına eklenir ve web panelindeki kurye istatistiklerinde görünür.
- **Veritabanı:** `orders` tablosuna `customer_rating` ve `customer_comment` kolonları eklenebilir.
