# Faz 1: Temel Operasyonlar ve Raporlar (Z-Raporu & Kasa Takibi)

Bu faz, restoran sahibinin günlük finansal kapanışlarını ve kuryelerin getirdiği paraları kolayca takip edebilmesini amaçlar.

## 1.1 Gün Sonu Z-Raporu Modülü
- **Hedef:** Web panelinde (`dashboard/page.tsx`) "Gün Sonu Özeti (Z-Raporu)" butonu eklenmesi.
- **İşlev:** Butona basıldığında o gün teslim edilen tüm siparişler, Nakit, Kart, Yemek Kartı ve Parçalı ödemeler filtrelenerek özet bir şablon (metin) halinde `navigator.clipboard.writeText` ile kopyalanacak.
- **Beklenen Şablon:** 
  ```text
  --- ORBİS GÜN SONU ÖZETİ ---
  Toplam Sipariş: X
  Toplam Ciro: ₺Y
  Nakit Tahsilat: ₺A | Kart Tahsilat: ₺B | Yemek Kartı: ₺C
  Bekleyen: X adet / ₺Z
  ```

## 1.2 Kurye Kasa ve Performans Takibi
- **Hedef:** Dashboard'da "Kurye Günlük Dağılımı ve Kasa" tablosu veya kartları oluşturulması.
- **İşlev:** O gün teslimat yapan kuryelerin "Üzerindeki Nakit", "Çektiği POS/Kart Tutarı" ve "Toplam Teslimat Sayısı" anlık olarak hesaplanıp listelenecek.
- **Amaç:** Gün sonunda hangi kuryeden ne kadar nakit teslim alınacağının net olarak görülmesi.
