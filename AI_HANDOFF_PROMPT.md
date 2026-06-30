# Orbis - AI Handoff Prompt & Master Plan (Production-Ready)

Sen bir AI asistanısın ve bu projeyi ("Orbis") production seviyesine (gerçek hayatta kullanılabilir bir SaaS uygulamasına) taşımak için görevlendirildin. Proje DevOps aşamasından çıkıp artık "Feature (Özellik) Geliştirme ve MVP Tamamlama" aşamasındadır.

Bu belge, senin doğrudan okuyup kodlamaya başlayabileceğin, görev sırasını ve kesin uyman gereken kod standartlarını içeren ana yol haritandır. Lütfen bu yönergeyi sırasıyla takip et ve her bir adımı bitirmeden bir sonrakine geçme.

---

## 🏗 Proje Özeti
**Orbis**, restoranların kurye takibini ve kuryelerin sipariş yönetimini sağlayan eşzamanlı (real-time) bir lojistik yönetim platformudur.
- **Web (`apps/web`):** Next.js (App Router), Tailwind CSS
- **Mobil (`apps/mobile`):** React Native (Expo), NativeWind, MapboxGL
- **Veritabanı (`supabase`):** PostgreSQL, Supabase Realtime, Row Level Security (RLS)

Daha fazla detay için projede bulunan `md/PROJECT_STATE.md` dosyasını okuyabilirsin.

---

## 📜 Kesin Uyman Gereken Teknik Standartlar (Best Practices)

Kodlamaya başlamadan ve herhangi bir dosyayı değiştirmeden önce bu kuralları **kesinlikle** kavramalısın:

1. **Supabase Migration Zorunluluğu:** Supabase tarafında tablo, kolon veya RLS yetki kurallarında yapacağın HERHANGİ BİR değişiklik için **mutlaka** `supabase/migrations/` klasöründe yeni bir SQL migration dosyası oluşturmalısın. Veritabanına manuel müdahale (GUI veya CLI üzerinden direkt alter) YASAKTIR.
2. **Expo & Native Modül Hassasiyeti (isExpoGo):** Mobil uygulama tarafında geliştirme yaparken native kütüphanelerin (Mapbox vb.) Expo Go ortamında patlamaması için daima `isExpoGo` veya benzeri fallback (geri dönüş) senaryolarını kodlamalısın.
3. **Tailwind CSS & UI Bileşenleri:** Stil işlemleri sadece Tailwind CSS ile yapılacaktır. Inline style (`style={{...}}`) kullanımı kesinlikle yasaktır. Projede bulunan mevcut UI bileşenlerini (shadcn/ui veya custom components) tekrar kullanmaya özen göster.
4. **Strict TypeScript (any YASAK):** Kod tabanında TypeScript `strict` modu geçerlidir. Hiçbir yerde `any` tipi kullanmamalısın. Gerekirse interface ve typeları `types/` klasöründe açıkça tanımla.
5. **Test ve Doğrulama Planı (Verification):** Geliştirdiğin her yeni özellik sonrasında (ister API ister UI olsun), özelliğin çalıştığını nasıl test edeceğimizi gösteren manuel/otomatik test adımlarını sağlamalısın. 

---

## 🚀 Görev Sıralaması (Execution Order)

Geliştirme sürecinde "hızlı kazanım (quick win)" mantığıyla kolaydan zora doğru ilerleyeceksin. Lütfen aşağıdaki fazları **sırasıyla** tamamla. Her faz tamamlandığında kullanıcıya haber ver.

### Faz 1: Tema, Sesli Bildirimler ve Müşteri Deneyimi (Tahmini Zorluk: Kolay)
*Odak: UI/UX cila işlemleri ve hissiyatı güçlendirme.*
- Kurye mobil uygulamasında cihazın sistem ayarına göre **Otomatik Açık/Koyu Tema** entegrasyonunu tamamla.
- Web panelinde restorana yeni sipariş düştüğünde çalacak **Sesli Uyarı (Mutfak Zili)** sistemini kur.
- Kullanıcılar için **Müşteri Sipariş Takip Linki** arayüzünü (basit bir web sayfası) ve teslimat sonrası **1-5 Yıldızlı Değerlendirme** sistemini geliştir.
- *(Detaylar için: `md/master_plans/02_theme_and_audio.md` ve `03_customer_experience.md` dosyalarına bakabilirsin.)*

### Faz 2: Kurye Hakediş ve Ödeme Yönetimi (Tahmini Zorluk: Orta)
*Odak: Finansal raporlama ve muhasebe.*
- Gün Sonu **Z-Raporu** oluşturma ve panoya kopyalama özelliğini tamamla.
- Kuryelerin üzerinde biriken Nakit (cash) ve POS tutarlarını restoran yöneticisinin anlık takip edebileceği **Kasa Takip / Hakediş Paneli**ni Web tarafında (`/dashboard/reports`) geliştir.
- *(Detaylar için: `md/master_plans/01_dashboard_reports_and_kasa.md`)*

### Faz 3: Gerçek Sipariş Entegrasyonları (Tahmini Zorluk: Orta-Zor)
*Odak: Dış sistemlerle API iletişimi.*
- Yemeksepeti, Getir ve Trendyol gibi platformlardan gelecek gerçek sipariş verilerini karşılayacak (mock olmayan) **Webhook Endpoints (API Routes)** oluştur.
- Gelen dış verileri (payload) parse edip `orders` tablosuna standardize edilmiş bir şekilde kaydeden servisleri (Next.js içerisinde) yaz.
- Güvenlik için webhook endpointlerine basit bir API Key / Token doğrulaması ekle.

### Faz 4: Kurye Canlı Konum Takibi (Tahmini Zorluk: Zor)
*Odak: Gerçek zamanlı veri akışı ve Harita optimizasyonu.*
- Kurye mobil uygulamasından (arkaplanda veya açıkken) belirli aralıklarla (örn: 5-10 sn) GPS koordinatlarının Supabase `couriers` tablosuna (veya Redis/Realtime presence) yazılmasını sağla.
- Web panelindeki harita üzerinde (Mapbox), aktif kuryelerin konumlarının **canlı (real-time) marker** olarak hareket etmesini sağla.
- RLS politikalarının kurye konumlarını koruduğundan emin ol.

### Faz 5: Akıllı Rota ve Otomatik Atama (Tahmini Zorluk: Çok Zor)
*Odak: Algoritmik verimlilik ve iş mantığı.*
- **Çoklu Teslimat Rota Optimizasyonu (Batch Routing):** Kuryenin alacağı birden fazla paketin en kısa güzergaha (Turf.js veya Mapbox Directions API) göre sıraya dizilmesi.
- **Otomatik Dispatch:** Sisteme düşen yeni bir siparişin, boştaki en yakın kuryeye sistem tarafından otomatik önerilmesi/atanması (Restoran panelinden bu özellik açıp kapatılabilir olmalı).
- *(Detaylar için: `md/master_plans/04_routing_and_dispatch.md`)*

---

## 🛠 Başlangıç İçin İlk Adımın

Bu yönergeyi okuduysan, sistemin mevcut durumunu anlamak için `PROJECT_STATE.md` dosyasını gözden geçir ve doğrudan **Faz 1**'in ilk maddesi olan *Otomatik Açık/Koyu Tema* veya *Sesli Bildirim* işlemlerine başla. 

Kolay gelsin!
