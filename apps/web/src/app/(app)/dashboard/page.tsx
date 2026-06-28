'use client';

import { useOrders, useRealtimeOrders } from '@/hooks/useOrders';
import { TrendingUp, Calendar, Package, Clock, MapPin, CreditCard, Banknote, AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
  const { data: orders = [], isLoading } = useOrders();
  useRealtimeOrders();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const deliveredOrders = orders.filter(o => o.status === 'delivered');

  const todayOrders = deliveredOrders.filter(o => new Date(o.created_at) >= startOfToday);
  const todaySales = todayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

  const monthOrders = deliveredOrders.filter(o => new Date(o.created_at) >= startOfMonth);
  const monthSales = monthOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

  // Bugünkü nakit tahsilat (cash collected today)
  const todayCashCollected = todayOrders
    .filter(o => o.payment_method === 'cash' && o.payment_status === 'collected')
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  // Bugünkü kart tahsilatı (card collected today)
  const todayCardCollected = todayOrders
    .filter(o => o.payment_method === 'card' && o.payment_status === 'collected')
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  // Tahsilat bekleyen teslim edilmiş siparişler (all-time pending collections)
  const pendingPaymentOrders = orders.filter(o => o.status === 'delivered' && o.payment_status === 'pending');
  const pendingPaymentSales = pendingPaymentOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

  // Tahsil edilemeyen teslim edilmiş siparişler (all-time failed collections)
  const failedPaymentOrders = orders.filter(o => o.status === 'delivered' && o.payment_status === 'failed');
  const failedPaymentSales = failedPaymentOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Cash Collected */}
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Banknote className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-sm font-medium text-[#a1a1aa]">Nakit Tahsilat (Bugün)</p>
            </div>
            <p className="text-2xl font-bold text-white">₺{todayCashCollected.toFixed(2)}</p>
            <p className="text-xs text-[#52525b] mt-1">Bugün teslim edilip nakit alınan</p>
          </div>

          {/* Today's Card Collected */}
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-sm font-medium text-[#a1a1aa]">Kart Tahsilatı (Bugün)</p>
            </div>
            <p className="text-2xl font-bold text-white">₺{todayCardCollected.toFixed(2)}</p>
            <p className="text-xs text-[#52525b] mt-1">Bugün teslim edilip kartla alınan</p>
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
            <p className="text-xs text-[#52525b] mt-1">{pendingPaymentOrders.length} sipariş tahsilat bekliyor</p>
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
            <p className="text-xs text-[#52525b] mt-1">{failedPaymentOrders.length} siparişte ödeme başarısız</p>
          </div>
        </div>
      </div>

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
