# Faz 4: Algoritmik Verimlilik (Rota & Otomatik Atama)

Bu faz, sipariş atama süreçlerindeki insan faktörünü ve hata payını sıfıra indirmeyi hedefler.

## 4.1 Otomatik Kurye Atama Sistemi (Auto-Assignment Algorithm)
- **Hedef:** Hazırlanan siparişlerin en uygun kuryeye otomatik atanması.
- **İşlev:** Sipariş "pending" (bekliyor) veya "ready" durumuna geçtiğinde; arka planda çalışan bir Supabase Edge Function veya API route, `is_available = true` olan ve lokasyon olarak restorana en yakın / elinde en az paket olan kuryeyi bulur ve siparişi ona atar.

## 4.2 Çoklu Teslimat Rota Optimizasyonu (Batch Order Routing)
- **Hedef:** Bir kuryeye atanan 2 veya daha fazla sipariş için en kısa yolun hesaplanması.
- **İşlev:** Kurye uygulamasında "Aktif Siparişler" ekranında harita açıldığında, birden fazla durak noktası varsa (Traveling Salesperson Problem benzeri) duraklar adres yakınlığına göre otomatik sıralanır ve kuryeye "Önce X adresine, sonra Y adresine git" şeklinde optimize edilmiş bir rota verilir.
