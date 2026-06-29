'use client';

import { useOrders } from '@/hooks/useOrders';
import { TrendingUp, Clock, Truck, Package, MapPin, AlertTriangle } from 'lucide-react';
import type { OrderWithCourier } from '@/lib/types';
import dynamic from 'next/dynamic';

const HeatMap = dynamic(() => import('./HeatMap'), { ssr: false, loading: () => (
  <div className="flex h-64 items-center justify-center bg-[#0f0f0f] rounded-xl">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#f97316] border-t-transparent" />
  </div>
) });

function minutesBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  return (new Date(b).getTime() - new Date(a).getTime()) / 60_000;
}

function avgOf(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map(({ label, value, color }) => (
        <div key={label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#a1a1aa]">{label}</span>
            <span className="font-semibold text-white">{value.toFixed(1)} dk</span>
          </div>
          <div className="h-2 rounded-full bg-[#1e1e1e] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(value / max) * 100}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof Clock; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <p className="text-sm font-medium text-[#a1a1aa]">{label}</p>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-[#52525b] mt-1">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: orders = [], isLoading } = useOrders();

  const delivered = orders.filter((o): o is OrderWithCourier => o.status === 'delivered');

  // Kitchen time: created_at → assigned_at
  const kitchenTimes = delivered
    .map(o => minutesBetween(o.created_at, o.assigned_at))
    .filter((v): v is number => v !== null && v > 0 && v < 180);

  // Courier time: picked_up_at → delivered_at
  const courierTimes = delivered
    .map(o => minutesBetween(o.picked_up_at, o.delivered_at))
    .filter((v): v is number => v !== null && v > 0 && v < 120);

  // Total time: created_at → delivered_at
  const totalTimes = delivered
    .map(o => minutesBetween(o.created_at, o.delivered_at))
    .filter((v): v is number => v !== null && v > 0 && v < 300);

  const avgKitchen = avgOf(kitchenTimes);
  const avgCourier = avgOf(courierTimes);
  const avgTotal = avgOf(totalTimes);

  // Delayed orders (total > 60 min)
  const delayedCount = totalTimes.filter(t => t > 60).length;
  const delayRate = delivered.length ? ((delayedCount / delivered.length) * 100) : 0;

  // Hourly distribution
  const hourlyMap: Record<number, number> = {};
  orders.forEach(o => {
    const h = new Date(o.created_at).getHours();
    hourlyMap[h] = (hourlyMap[h] ?? 0) + 1;
  });
  const peakHour = Object.entries(hourlyMap).sort((a, b) => b[1] - a[1])[0];

  // Heatmap points
  const heatmapPoints = delivered
    .filter(o => o.customer_lat != null && o.customer_lng != null)
    .map(o => ({ lat: o.customer_lat!, lng: o.customer_lng! }));

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
        <h1 className="text-2xl font-bold text-white">Analitik</h1>
        <p className="mt-1 text-sm text-[#a1a1aa]">{delivered.length} teslim edilmiş sipariş üzerinden hesaplanmıştır.</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Clock}   label="Ort. Mutfak Süresi"  value={`${avgKitchen.toFixed(0)} dk`}  sub="Sipariş → Kurye atama" color="#f97316" />
        <MetricCard icon={Truck}   label="Ort. Teslimat Süresi" value={`${avgCourier.toFixed(0)} dk`} sub="Teslim alım → Müşteri" color="#60a5fa" />
        <MetricCard icon={Package} label="Ort. Toplam Süre"    value={`${avgTotal.toFixed(0)} dk`}    sub="Sipariş → Teslim"   color="#a855f7" />
        <MetricCard icon={AlertTriangle} label="Gecikme Oranı" value={`%${delayRate.toFixed(1)}`}      sub={`${delayedCount} sipariş 60 dk+ sürdü`} color="#ef4444" />
      </div>

      {/* Delay breakdown chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Süre Analizi</h2>
          {avgKitchen > 0 || avgCourier > 0 ? (
            <BarChart data={[
              { label: 'Mutfak Süresi (ort.)',    value: avgKitchen, color: '#f97316' },
              { label: 'Kurye Süresi (ort.)',      value: avgCourier, color: '#60a5fa' },
              { label: 'Toplam Süre (ort.)',       value: avgTotal,   color: '#a855f7' },
            ]} />
          ) : (
            <p className="text-sm text-[#52525b] text-center py-6">Yeterli veri yok</p>
          )}
        </div>

        <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Saatlik Sipariş Dağılımı</h2>
          {Object.keys(hourlyMap).length > 0 ? (
            <div className="space-y-1">
              {Array.from({ length: 24 }, (_, h) => ({ h, count: hourlyMap[h] ?? 0 }))
                .filter(({ count }) => count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 8)
                .map(({ h, count }) => {
                  const max = Math.max(...Object.values(hourlyMap));
                  return (
                    <div key={h} className="flex items-center gap-2">
                      <span className="text-xs text-[#52525b] w-12 shrink-0">{String(h).padStart(2, '0')}:00</span>
                      <div className="flex-1 h-2 rounded-full bg-[#1e1e1e] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#f97316]"
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-white w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              {peakHour && (
                <p className="text-xs text-[#52525b] mt-3 pt-3 border-t border-[#2a2a2a]">
                  Zirve saat: <span className="text-white font-semibold">{String(Number(peakHour[0])).padStart(2,'0')}:00</span> — {peakHour[1]} sipariş
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#52525b] text-center py-6">Yeterli veri yok</p>
          )}
        </div>
      </div>

      {/* Heatmap */}
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-4 w-4 text-[#f97316]" />
          <h2 className="text-sm font-semibold text-white">Teslimat Yoğunluk Haritası</h2>
          <span className="ml-auto text-xs text-[#52525b]">{heatmapPoints.length} teslimat</span>
        </div>
        {heatmapPoints.length > 0 ? (
          <HeatMap points={heatmapPoints} />
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-[#52525b]">
            <MapPin className="h-8 w-8 mb-2" />
            <p className="text-sm">Koordinat verisi olan teslimat bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  );
}
