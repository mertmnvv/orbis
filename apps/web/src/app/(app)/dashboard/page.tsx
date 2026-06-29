'use client';

import { useState } from 'react';
import { useOrders, useRealtimeOrders } from '@/hooks/useOrders';
import { parseSplitPaymentNotes } from '@orbis/validators';
import { TrendingUp, Calendar, Package, Clock, MapPin, CreditCard, Banknote, AlertTriangle, Wallet, ClipboardCheck, Users } from 'lucide-react';
type CourierCashStats = {
  name: string;
  deliveryCount: number;
  cash: number;
  card: number;
  foodCard: number;
};

function generateZReport(params: {
  todayOrderCount: number;
  todaySales: number;
  todayCashCollected: number;
  todayCardCollected: number;
  todayFoodCardCollected: number;
  pendingCount: number;
  pendingSales: number;
}): string {
  const now = new Date().toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  return [
    `--- ORBİS GÜN SONU ÖZETİ ---`,
    `Tarih: ${now}`,
    `Toplam Sipariş: ${params.todayOrderCount}`,
    `Toplam Ciro: ₺${params.todaySales.toFixed(2)}`,
    `Nakit Tahsilat: ₺${params.todayCashCollected.toFixed(2)} | Kart Tahsilat: ₺${params.todayCardCollected.toFixed(2)} | Yemek Kartı: ₺${params.todayFoodCardCollected.toFixed(2)}`,
    `Bekleyen: ${params.pendingCount} adet / ₺${params.pendingSales.toFixed(2)}`,
  ].join('\n');
}

export default function DashboardPage() {
  const { data: orders = [], isLoading } = useOrders();
  useRealtimeOrders();
  const [zReportCopied, setZReportCopied] = useState(false);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const deliveredOrders = orders.filter(o => o.status === 'delivered');

  const todayOrders = deliveredOrders.filter(o => new Date(o.created_at) >= startOfToday);
  const todaySales = todayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

  const monthOrders = deliveredOrders.filter(o => new Date(o.created_at) >= startOfMonth);
  const monthSales = monthOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

  // Calculate detailed daily collections (including split payments)
  let todayCashCollected = 0;
  let todayCardCollected = 0;
  let todayFoodCardCollected = 0;

  todayOrders.forEach(o => {
    if (o.payment_status !== 'collected') return;
    if (o.payment_method === 'cash') {
      todayCashCollected += Number(o.total_amount);
    } else if (o.payment_method === 'card') {
      todayCardCollected += Number(o.total_amount);
    } else if (o.payment_method === 'food_card') {
      todayFoodCardCollected += Number(o.total_amount);
    } else if (o.payment_method === 'split' && o.payment_notes) {
      const splitData = parseSplitPaymentNotes(o.payment_notes);
      if (splitData?.split) {
        todayCashCollected += Number(splitData.split.cash) || 0;
        todayCardCollected += Number(splitData.split.card) || 0;
        todayFoodCardCollected += Number(splitData.split.food_card) || 0;
      } else {
        todayCashCollected += Number(o.total_amount);
      }
    }
  });

  // Tahsilat bekleyen teslim edilmiş siparişler (all-time pending collections)
  const pendingPaymentOrders = orders.filter(o => o.status === 'delivered' && o.payment_status === 'pending');
  const pendingPaymentSales = pendingPaymentOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

  // Tahsil edilemeyen teslim edilmiş siparişler (all-time failed collections)
  const failedPaymentOrders = orders.filter(o => o.status === 'delivered' && o.payment_status === 'failed');
  const failedPaymentSales = failedPaymentOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

  // POS sync hatası olan siparişler (Supabase'e yazılamayan kart tahsilatları)
  const posSyncFailedOrders = orders.filter(o => o.pos_sync_status === 'failed');

  // Kurye kasa istatistikleri — bugün teslimat yapan kuryelerin nakit/kart tutarları
  const courierStatsMap = new Map<string, CourierCashStats>();
  todayOrders.forEach(o => {
    if (!o.courier_id || !o.courier) return;
    if (!courierStatsMap.has(o.courier_id)) {
      courierStatsMap.set(o.courier_id, {
        name: o.courier.name || 'Bilinmiyor',
        deliveryCount: 0,
        cash: 0,
        card: 0,
        foodCard: 0,
      });
    }
    const stats = courierStatsMap.get(o.courier_id)!;
    stats.deliveryCount++;
    if (o.payment_status === 'collected') {
      if (o.payment_method === 'cash') {
        stats.cash += Number(o.total_amount);
      } else if (o.payment_method === 'card') {
        stats.card += Number(o.total_amount);
      } else if (o.payment_method === 'food_card') {
        stats.foodCard += Number(o.total_amount);
      } else if (o.payment_method === 'split' && o.payment_notes) {
        const splitData = parseSplitPaymentNotes(o.payment_notes);
        if (splitData?.split) {
          stats.cash += Number(splitData.split.cash) || 0;
          stats.card += Number(splitData.split.card) || 0;
          stats.foodCard += Number(splitData.split.food_card) || 0;
        }
      }
    }
  });
  const courierStatsList = Array.from(courierStatsMap.values()).sort((a, b) => b.deliveryCount - a.deliveryCount);

  function handleCopyZReport() {
    const report = generateZReport({
      todayOrderCount: todayOrders.length,
      todaySales,
      todayCashCollected,
      todayCardCollected,
      todayFoodCardCollected,
      pendingCount: pendingPaymentOrders.length,
      pendingSales: pendingPaymentSales,
    });
    navigator.clipboard.writeText(report).then(() => {
      setZReportCopied(true);
      setTimeout(() => setZReportCopied(false), 2500);
    });
  }

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Bekliyor',
    assigned: 'Kurye Atandı',
    picked_up: 'Yolda',
    delivered: 'Teslim Edildi',
    cancelled: 'İptal',
  };

  const STATUS_COLORS: Record<string, string> = {
    pending:   'bg-orange-500/20 text-orange-500',
    assigned:  'bg-blue-500/20 text-blue-500',
    picked_up: 'bg-purple-500/20 text-purple-500',
    delivered: 'bg-green-500/20 text-green-500',
    cancelled: 'bg-red-500/20 text-red-500',
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#f97316] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6 space-y-6 overflow-y-auto bg-[#0a0a0a]">
      <div>
        <h1 className="text-2xl font-bold text-white">Özet & Raporlar</h1>
        <p className="mt-1 text-sm text-[#a1a1aa]">Güncel satış verileriniz ve tüm geçmiş siparişleriniz.</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        {/* Daily Sales */}
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm font-medium text-[#a1a1aa]">Bugünkü Ciro</p>
          </div>
          <p className="text-2xl font-bold text-white">₺{todaySales.toFixed(2)}</p>
          <p className="text-xs text-[#52525b] mt-1">{todayOrders.length} başarılı sipariş</p>
        </div>

        {/* Monthly Sales */}
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-sm font-medium text-[#a1a1aa]">Bu Ayki Ciro</p>
          </div>
          <p className="text-2xl font-bold text-white">₺{monthSales.toFixed(2)}</p>
          <p className="text-xs text-[#52525b] mt-1">{monthOrders.length} başarılı sipariş</p>
        </div>

        {/* Total Orders */}
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Package className="h-5 w-5 text-[#f97316]" />
            </div>
            <p className="text-sm font-medium text-[#a1a1aa]">Sistemdeki Siparişler</p>
          </div>
          <p className="text-2xl font-bold text-white">{orders.length}</p>
          <p className="text-xs text-[#52525b] mt-1">Tüm zamanlar toplam kayıt</p>
        </div>
      </div>

      {/* Payment Metrics Section */}
      <div className="space-y-3 shrink-0">
        <h2 className="text-xs font-semibold text-white uppercase tracking-wider text-[#71717a]">Ödeme & Tahsilat Raporu</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Today's Cash Collected */}
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Banknote className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-sm font-medium text-[#a1a1aa]">Nakit (Bugün)</p>
            </div>
            <p className="text-2xl font-bold text-white">₺{todayCashCollected.toFixed(2)}</p>
            <p className="text-xs text-[#52525b] mt-1">Bugün nakit olarak alınan</p>
          </div>

          {/* Today's Card Collected */}
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-sm font-medium text-[#a1a1aa]">Kart (Bugün)</p>
            </div>
            <p className="text-2xl font-bold text-white">₺{todayCardCollected.toFixed(2)}</p>
            <p className="text-xs text-[#52525b] mt-1">Bugün kartla tahsil edilen</p>
          </div>

          {/* Today's Food Card Collected */}
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-indigo-500/10">
                <Wallet className="h-5 w-5 text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-[#a1a1aa]">Yemek Kartı (Bugün)</p>
            </div>
            <p className="text-2xl font-bold text-white">₺{todayFoodCardCollected.toFixed(2)}</p>
            <p className="text-xs text-[#52525b] mt-1">Bugün yemek kartıyla alınan</p>
          </div>

          {/* Pending Collections */}
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <p className="text-sm font-medium text-[#a1a1aa]">Bekleyen Tahsilat</p>
            </div>
            <p className="text-2xl font-bold text-yellow-500">₺{pendingPaymentSales.toFixed(2)}</p>
            <p className="text-xs text-[#52525b] mt-1">{pendingPaymentOrders.length} sipariş bekliyor</p>
          </div>

          {/* Failed Collections */}
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <p className="text-sm font-medium text-[#a1a1aa]">Tahsil Edilemeyen</p>
            </div>
            <p className="text-2xl font-bold text-red-500">₺{failedPaymentSales.toFixed(2)}</p>
            <p className="text-xs text-[#52525b] mt-1">{failedPaymentOrders.length} siparişte başarısız</p>
          </div>

          {posSyncFailedOrders.length > 0 && (
            <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <p className="text-sm font-medium text-[#a1a1aa]">POS Sync Hatası</p>
              </div>
              <p className="text-2xl font-bold text-orange-500">{posSyncFailedOrders.length}</p>
              <p className="text-xs text-[#52525b] mt-1">Kart ödemesi kaydedilemedi — yöneticiye bildirin</p>
            </div>
          )}
        </div>
      </div>

      {/* Z-Raporu Butonu */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">Gün Sonu Özeti</h2>
          <p className="text-xs text-[#52525b] mt-0.5">Bugünün özetini panoya kopyalayın.</p>
        </div>
        <button
          onClick={handleCopyZReport}
          className="flex items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#141414] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1e1e1e] hover:border-[#f97316] active:scale-95"
        >
          <ClipboardCheck className={`h-4 w-4 ${zReportCopied ? 'text-green-500' : 'text-[#f97316]'}`} />
          {zReportCopied ? 'Kopyalandı!' : 'Z-Raporu Kopyala'}
        </button>
      </div>

      {/* Kurye Kasa & Performans Tablosu */}
      {courierStatsList.length > 0 && (
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] overflow-hidden shrink-0">
          <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center gap-2">
            <Users className="h-4 w-4 text-[#f97316]" />
            <h2 className="text-sm font-semibold text-white">Kurye Günlük Kasa & Performans</h2>
            <span className="ml-auto text-xs text-[#52525b]">Bugün teslimat yapanlar</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1e1e1e] text-xs uppercase text-[#52525b]">
                <tr>
                  <th className="px-6 py-3 font-medium">Kurye</th>
                  <th className="px-6 py-3 font-medium text-center">Teslimat</th>
                  <th className="px-6 py-3 font-medium text-right">Üzerindeki Nakit</th>
                  <th className="px-6 py-3 font-medium text-right">Kart / POS</th>
                  <th className="px-6 py-3 font-medium text-right">Yemek Kartı</th>
                  <th className="px-6 py-3 font-medium text-right">Toplam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {courierStatsList.map((c) => (
                  <tr key={c.name} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-6 py-3 font-medium text-white">{c.name}</td>
                    <td className="px-6 py-3 text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-[#f97316]/10 px-2.5 py-0.5 text-xs font-semibold text-[#f97316]">
                        {c.deliveryCount}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="font-semibold text-amber-400">₺{c.cash.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-3 text-right text-blue-400">₺{c.card.toFixed(2)}</td>
                    <td className="px-6 py-3 text-right text-indigo-400">₺{c.foodCard.toFixed(2)}</td>
                    <td className="px-6 py-3 text-right font-bold text-white">
                      ₺{(c.cash + c.card + c.foodCard).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] overflow-hidden flex-1 flex flex-col min-h-[400px]">
        <div className="px-6 py-5 border-b border-[#2a2a2a]">
          <h2 className="text-lg font-semibold text-white">Geçmiş Tüm Siparişler</h2>
        </div>
        
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left text-sm text-[#a1a1aa]">
            <thead className="bg-[#1e1e1e] text-xs uppercase text-[#52525b] sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Sipariş & Tarih</th>
                <th className="px-6 py-4 font-medium">Müşteri & Adres</th>
                <th className="px-6 py-4 font-medium">Ürün Detayı</th>
                <th className="px-6 py-4 font-medium text-right">Tutar</th>
                <th className="px-6 py-4 font-medium text-center">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {orders.map((order) => {
                const dateStr = new Date(order.created_at).toLocaleString('tr-TR', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                });

                return (
                  <tr key={order.id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1e1e1e] flex items-center justify-center border border-[#2a2a2a]">
                          <span className="text-xs font-bold text-white">#{order.id.slice(0, 4)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-white capitalize">{order.platform.replace('_', ' ')}</p>
                          <div className="flex items-center gap-1 mt-0.5 text-[#52525b] text-xs">
                            <Clock className="w-3 h-3" />
                            {dateStr}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-white mb-0.5">{order.customer_name}</p>
                      <div className="flex items-start gap-1 text-xs text-[#52525b] max-w-[200px]">
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <p className="truncate" title={order.customer_address}>{order.customer_address}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-[250px] space-y-1">
                        {(order.items as any[])?.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-white truncate pr-2">{item.quantity}x {item.name}</span>
                            <span className="text-[#52525b] shrink-0">₺{item.price}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5 font-bold text-white bg-[#1e1e1e] px-2.5 py-1 rounded-lg border border-[#2a2a2a]">
                        <CreditCard className="w-3.5 h-3.5 text-[#f97316]" />
                        ₺{order.total_amount}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#52525b]">
                    Henüz hiç sipariş bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
