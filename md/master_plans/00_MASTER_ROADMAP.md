# Orbis Projesi: Master Yol Haritası (Master Roadmap)

Bu klasör, Orbis monorepo (Web Paneli + Kurye Mobil Uygulaması + Supabase) projesinin uçtan uca tamamlanması ve SaaS (Software as a Service) seviyesine taşınması için gereken tüm geliştirme planlarını içerir. 
Bu klasördeki yönergeler, projedeki eksikleri gidermek ve yeni vizyoner özellikleri eklemek amacıyla bir yapay zeka asistanına (AI Coder) verilmek üzere hazırlanmıştır.

## Özellik Haritası (Feature Map)

Harita 5 ana faza ayrılmıştır. Sırayla uygulanması tavsiye edilir:

1. **[Faz 1: Temel Operasyonlar ve Raporlar (Z-Raporu & Kasa Takibi) ](01_dashboard_reports_and_kasa.md)**
   - Gün Sonu Z-Raporu (Özetin panoya kopyalanması).
   - Kuryelerin üzerinde biriken nakit ve pos tutarlarının restoran panelinden anlık takibi.

2. **[Faz 2: Arayüz ve Bildirimler (Tema & Sesli Uyarılar)](02_theme_and_audio.md)**
   - Kurye mobil uygulamasında sistem saatine/ayarına göre Otomatik Açık/Koyu Tema desteği.
   - Restoran web paneline yeni sipariş düştüğünde çalacak sesli mutfak zili (Audio Alerts) entegrasyonu.

3. **[Faz 3: Müşteri Deneyimi (Takip Linki & Puanlama)](03_customer_experience.md)**
   - SMS/WhatsApp üzerinden paylaşılan Canlı Sipariş Takip linki (Harita üzerinden kurye izleme).
   - Sipariş sonrası 1-5 yıldızlı Müşteri Değerlendirme Sistemi.
   - *Not: Bu özellikler Restoran Ayarları (Settings) panelinden açılıp kapatılabilir (toggleable) olacaktır.*

4. **[Faz 4: Algoritmik Verimlilik (Rota & Otomatik Atama)](04_routing_and_dispatch.md)**
   - Çoklu Teslimat Rota Optimizasyonu (Batch Order Routing).
   - Boştaki kuryeye konuma göre Akıllı/Otomatik Sipariş Atama Sistemi.

5. **[Faz 5: İleri Düzey Analitik ve Entegrasyonlar](05_analytics_and_inventory.md)**
   - Isı Haritası (Heatmap) ve Teslimat Gecikme Analizi grafikleri.
   - Menü ürünleri için Stok Takibi (Inventory Tracking).
   - Harici Sipariş Kaynağı Entegrasyonları için Webhook istasyonu.

**Hariç Tutulan Özellikler:** Bahşiş Takibi, In-App Chat ve Oyunlaştırma (Liderlik Tablosu) özellikleri bu yol haritasından kasıtlı olarak çıkarılmıştır.
