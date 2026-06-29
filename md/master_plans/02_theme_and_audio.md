# Faz 2: Arayüz ve Bildirimler (Tema & Sesli Uyarılar)

Bu faz, hem kuryenin saha şartlarında hem de restoran çalışanının mutfak şartlarında uygulamaları daha rahat kullanmasını hedefler.

## 2.1 Kurye Uygulaması Otomatik Tema Desteği
- **Hedef:** Kurye uygulamasının (React Native/Expo) sistem özelliklerine veya saate göre açık/koyu temaya geçmesi.
- **İşlev:** `useColorScheme` kancası ile temanın algılanması. NativeWind/Tailwind kullanılarak `dark:` varyantlarının (`apps/mobile`) tüm bileşenlere uygulanması (Örn: gece sürüşlerinde göz yormaması için `#0a0a0a` arka plan renkleri).

## 2.2 Web Paneli Sesli Bildirimler (Audio Alerts)
- **Hedef:** Restoran web paneline (`apps/web`) yeni bir sipariş düştüğünde veya gecikmiş/bekleyen sipariş süresi aşıldığında sesli uyarı verilmesi.
- **İşlev:** Tarayıcıda arka planda çalabilecek kısa bir "ding" veya "mutfak zili" ses dosyasının projeye eklenip, veritabanı dinleyicisinden (Supabase Realtime) gelen `INSERT` / `UPDATE` durumlarında tetiklenmesi.
