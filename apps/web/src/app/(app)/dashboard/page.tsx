'use client';

import { useMemo, useState } from 'react';
import { useOrders, useRealtimeOrders } from '@/hooks/useOrders';
import { parseSplitPaymentNotes } from '@orbis/validators';
import {
  TrendingUp, Calendar, Package, Clock, MapPin, CreditCard,
  Banknote, AlertTriangle, Wallet, ClipboardCheck, Users,
  ChevronDown, X, BarChart3, XCircle, Truck,
} from 'lucide-react';
import type { OrderWithCourier } from '@/lib/types';

// ─── Date helpers ────────────────────────────────────────────
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function formatISO(d: Date): string {
  return d.toISOString();
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function formatDateTR(d: Date): string {
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// ─── Presets ─────────────────────────────────────────────────
type PresetKey = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom';
const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'today', label: 'Bugün' },
  { key: 'yesterday', label: 'Dün' },
  { key: 'last7', label: 'Son 7 Gün' },
  { key: 'last30', label: 'Son 30 Gün' },
  { key: 'custom', label: 'Özel Tarih' },
];

function getPresetRange(key: PresetKey): { start: Date; end: Date } {
  const now = new Date();
  switch (key) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'yesterday': {
      const y = addDays(now, -1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case 'last7':
      return { start: startOfDay(addDays(now, -6)), end: endOfDay(now) };
    case 'last30':
      return { start: startOfDay(addDays(now, -29)), end: endOfDay(now) };
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
}

// ─── Types ───────────────────────────────────────────────────
type CourierCashStats = {
  name: string;
  deliveryCount: number;
  cash: number;
  card: number;
  foodCard: number;
  avgDeliveryMinutes: number | null;
};

type DailyBreakdown = {
  date: Date;
  dateLabel: string;
  orderCount: number;
  sales: number;
  cashCollected: number;
  cardCollected: number;
  foodCardCollected: number;
  pendingCount: number;
  pendingSales: number;
};

// ─── Z Report generator ─────────────────────────────────────
function generateZReport(params: {
  dateLabel: string;
  orderCount: number;
  sales: number;
  cashCollected: number;
  cardCollected: number;
  foodCardCollected: number;
  pendingCount: number;
  pendingSales: number;
}): string {
  return [
    `--- ORBİS GÜN SONU ÖZETİ ---`,
    `Tarih: ${params.dateLabel}`,
    `Toplam Sipariş: ${params.orderCount}`,
    `Toplam Ciro: ₺${params.sales.toFixed(2)}`,
    `Nakit Tahsilat: ₺${params.cashCollected.toFixed(2)} | Kart Tahsilat: ₺${params.cardCollected.toFixed(2)} | Yemek Kartı: ₺${params.foodCardCollected.toFixed(2)}`,
    `Bekleyen: ${params.pendingCount} adet / ₺${params.pendingSales.toFixed(2)}`,
  ].join('\n');
}

// ─── Payment helpers ─────────────────────────────────────────
function computePaymentSplit(o: OrderWithCourier) {
  let cash = 0, card = 0, foodCard = 0;
  if (o.payment_status !== 'collected') return { cash, card, foodCard };
  if (o.payment_method === 'cash') {
    cash = Number(o.total_amount);
  } else if (o.payment_method === 'card') {
    card = Number(o.total_amount);
  } else if (o.payment_method === 'food_card') {
    foodCard = Number(o.total_amount);
  } else if (o.payment_method === 'split' && o.payment_notes) {
    const splitData = parseSplitPaymentNotes(o.payment_notes);
    if (splitData?.split) {
      cash = Number(splitData.split.cash) || 0;
      card = Number(splitData.split.card) || 0;
      foodCard = Number(splitData.split.food_card) || 0;
    } else {
      cash = Number(o.total_amount);
    }
  }
  return { cash, card, foodCard };
}

function minutesBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const diff = (new Date(b).getTime() - new Date(a).getTime()) / 60_000;
  return diff > 0 && diff < 300 ? diff : null;
}

// ─── Platform labels & colours ───────────────────────────────
const PLATFORM_LABELS: Record<string, string> = {
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir',
  trendyol: 'Trendyol',
  pakettaksi: 'Paket Taksi',
  manual: 'Manuel',
};
const PLATFORM_COLORS: Record<string, string> = {
  yemeksepeti: '#ef4444',
  getir: '#a855f7',
  trendyol: '#f97316',
  pakettaksi: '#3b82f6',
  manual: '#22c55e',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  preparing: 'Hazırlanıyor',
  assigned: 'Kurye Atandı',
  picked_up: 'Yolda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange-500/20 text-orange-500',
  preparing: 'bg-cyan-500/20 text-cyan-500',
  assigned: 'bg-blue-500/20 text-blue-500',
  picked_up: 'bg-purple-500/20 text-purple-500',
  delivered: 'bg-green-500/20 text-green-500',
  cancelled: 'bg-red-500/20 text-red-500',
};

// ═════════════════════════════════════════════════════════════
// COMPONENT
// ═════════════════════════════════════════════════════════════
export default function DashboardPage() {
  // Date range state
  const [activePreset, setActivePreset] = useState<PresetKey>('today');
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState(formatDateInput(new Date()));
  const [customEnd, setCustomEnd] = useState(formatDateInput(new Date()));
  const [dateRange, setDateRange] = useState(getPresetRange('today'));

  // Clipboard states for daily Z reports
  const [copiedDay, setCopiedDay] = useState<string | null>(null);

  // Compute filter for useOrders
  const filter = useMemo(() => ({
    startDate: formatISO(dateRange.start),
    endDate: formatISO(dateRange.end),
  }), [dateRange]);

  const { data: orders = [], isLoading } = useOrders(filter);
  useRealtimeOrders();

  // ─── Preset handlers ────────────────────────────────────
  function handlePreset(key: PresetKey) {
    setActivePreset(key);
    if (key === 'custom') {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    setDateRange(getPresetRange(key));
  }

  function applyCustomRange() {
    const s = new Date(customStart);
    const e = new Date(customEnd);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return;
    setDateRange({ start: startOfDay(s), end: endOfDay(e) });
    setCustomOpen(false);
  }

  // ─── Computed metrics ───────────────────────────────────
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');
  const totalSales = deliveredOrders.reduce((s, o) => s + Number(o.total_amount), 0);
  const cancelledSales = cancelledOrders.reduce((s, o) => s + Number(o.total_amount), 0);
  const cancelRate = orders.length ? ((cancelledOrders.length / orders.length) * 100) : 0;

  // Payment breakdown
  let totalCash = 0, totalCard = 0, totalFoodCard = 0;
  deliveredOrders.forEach(o => {
    const sp = computePaymentSplit(o);
    totalCash += sp.cash;
    totalCard += sp.card;
    totalFoodCard += sp.foodCard;
  });

  // Pending & failed
  const pendingPaymentOrders = orders.filter(o => o.status === 'delivered' && o.payment_status === 'pending');
  const pendingPaymentSales = pendingPaymentOrders.reduce((s, o) => s + Number(o.total_amount), 0);
  const failedPaymentOrders = orders.filter(o => o.status === 'delivered' && o.payment_status === 'failed');
  const failedPaymentSales = failedPaymentOrders.reduce((s, o) => s + Number(o.total_amount), 0);
  const posSyncFailedOrders = orders.filter(o => o.pos_sync_status === 'failed');

  // Platform distribution
  const platformStats = useMemo(() => {
    const map = new Map<string, { count: number; sales: number }>();
    orders.forEach(o => {
      const p = o.platform;
      const cur = map.get(p) ?? { count: 0, sales: 0 };
      cur.count++;
      if (o.status === 'delivered') cur.sales += Number(o.total_amount);
      map.set(p, cur);
    });
    return Array.from(map.entries())
      .map(([platform, { count, sales }]) => ({ platform, count, sales }))
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  // Courier stats
  const courierStatsList = useMemo(() => {
    const map = new Map<string, CourierCashStats & { _deliveryTimes: number[] }>();
    deliveredOrders.forEach(o => {
      if (!o.courier_id || !o.courier) return;
      if (!map.has(o.courier_id)) {
        map.set(o.courier_id, {
          name: o.courier.name || 'Bilinmiyor',
          deliveryCount: 0, cash: 0, card: 0, foodCard: 0,
          avgDeliveryMinutes: null, _deliveryTimes: [],
        });
      }
      const stats = map.get(o.courier_id)!;
      stats.deliveryCount++;

      const sp = computePaymentSplit(o);
      stats.cash += sp.cash;
      stats.card += sp.card;
      stats.foodCard += sp.foodCard;

      const dt = minutesBetween(o.picked_up_at, o.delivered_at);
      if (dt !== null) stats._deliveryTimes.push(dt);
    });
    return Array.from(map.values()).map(({ _deliveryTimes, ...rest }) => ({
      ...rest,
      avgDeliveryMinutes: _deliveryTimes.length
        ? _deliveryTimes.reduce((a, b) => a + b, 0) / _deliveryTimes.length
        : null,
    })).sort((a, b) => b.deliveryCount - a.deliveryCount);
  }, [deliveredOrders]);

  // ─── Daily breakdown (for multi-day Z reports) ──────────
  const isMultiDay = !isSameDay(dateRange.start, dateRange.end);
  const dailyBreakdown = useMemo<DailyBreakdown[]>(() => {
    if (!isMultiDay) return [];
    const days: DailyBreakdown[] = [];
    let cursor = new Date(dateRange.start);
    while (cursor <= dateRange.end) {
      const dayStart = startOfDay(cursor);
      const dayEnd = endOfDay(cursor);
      const dayOrders = deliveredOrders.filter(o => {
        const d = new Date(o.created_at);
        return d >= dayStart && d <= dayEnd;
      });
      const dayPending = orders.filter(o => {
        const d = new Date(o.created_at);
        return d >= dayStart && d <= dayEnd && o.status === 'delivered' && o.payment_status === 'pending';
      });

      let cash = 0, card = 0, fc = 0;
      dayOrders.forEach(o => {
        const sp = computePaymentSplit(o);
        cash += sp.cash; card += sp.card; fc += sp.foodCard;
      });

      days.push({
        date: new Date(dayStart),
        dateLabel: formatDateTR(dayStart),
        orderCount: dayOrders.length,
        sales: dayOrders.reduce((s, o) => s + Number(o.total_amount), 0),
        cashCollected: cash,
        cardCollected: card,
        foodCardCollected: fc,
        pendingCount: dayPending.length,
        pendingSales: dayPending.reduce((s, o) => s + Number(o.total_amount), 0),
      });
      cursor = addDays(cursor, 1);
    }
    return days.filter(d => d.orderCount > 0);
  }, [isMultiDay, dateRange, deliveredOrders, orders]);

  // Z-Report copy per day
  function handleCopyDayZReport(day: DailyBreakdown) {
    const report = generateZReport({
      dateLabel: day.dateLabel,
      orderCount: day.orderCount,
      sales: day.sales,
      cashCollected: day.cashCollected,
      cardCollected: day.cardCollected,
      foodCardCollected: day.foodCardCollected,
      pendingCount: day.pendingCount,
      pendingSales: day.pendingSales,
    });
    navigator.clipboard.writeText(report).then(() => {
      setCopiedDay(day.dateLabel);
      setTimeout(() => setCopiedDay(null), 2500);
    });
  }

  // Single-day Z report
  function handleCopySingleZReport() {
    const report = generateZReport({
      dateLabel: formatDateTR(dateRange.start),
      orderCount: deliveredOrders.length,
      sales: totalSales,
      cashCollected: totalCash,
      cardCollected: totalCard,
      foodCardCollected: totalFoodCard,
      pendingCount: pendingPaymentOrders.length,
      pendingSales: pendingPaymentSales,
    });
    navigator.clipboard.writeText(report).then(() => {
      setCopiedDay('__single__');
      setTimeout(() => setCopiedDay(null), 2500);
    });
  }

  // ─── Loading ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#f97316] border-t-transparent" />
      </div>
    );
  }

  const rangeLabel = activePreset === 'custom'
    ? `${formatDateTR(dateRange.start)} – ${formatDateTR(dateRange.end)}`
    : PRESETS.find(p => p.key === activePreset)?.label ?? '';

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col p-6 space-y-6 overflow-y-auto bg-[#0a0a0a]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Özet &amp; Raporlar</h1>
        <p className="mt-1 text-sm text-[#a1a1aa]">
          {rangeLabel} — {orders.length} sipariş
        </p>
      </div>

      {/* ─── Date Range Selector ────────────────────────── */}
      <div className="shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => handlePreset(p.key)}
              className={`
                flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium
                transition-all duration-200
                ${activePreset === p.key
                  ? 'bg-[#f97316] text-white shadow-lg shadow-[#f97316]/20'
                  : 'border border-[#2a2a2a] bg-[#141414] text-[#a1a1aa] hover:border-[#f97316]/50 hover:text-white'}
              `}
            >
              {p.key === 'custom' && <Calendar className="h-3.5 w-3.5" />}
              {p.label}
              {p.key === 'custom' && activePreset === 'custom' && (
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${customOpen ? 'rotate-180' : ''}`} />
              )}
            </button>
          ))}
        </div>

        {/* Custom date range dropdown */}
        {customOpen && (
          <div className="mt-3 flex items-end gap-3 rounded-xl border border-[#2a2a2a] bg-[#141414] p-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#71717a]">Başlangıç</label>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:border-[#f97316] focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#71717a]">Bitiş</label>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:border-[#f97316] focus:outline-none"
              />
            </div>
            <button
              onClick={applyCustomRange}
              className="rounded-lg bg-[#f97316] px-4 py-2 text-sm font-medium text-white hover:bg-[#ea580c] transition-colors"
            >
              Uygula
            </button>
            <button
              onClick={() => { setCustomOpen(false); setActivePreset('today'); setDateRange(getPresetRange('today')); }}
              className="rounded-lg border border-[#2a2a2a] p-2 text-[#71717a] hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* ─── Metric Cards ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        {/* Total Revenue */}
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm font-medium text-[#a1a1aa]">Toplam Ciro</p>
          </div>
          <p className="text-2xl font-bold text-white">₺{totalSales.toFixed(2)}</p>
          <p className="text-xs text-[#52525b] mt-1">{deliveredOrders.length} başarılı sipariş</p>
        </div>

        {/* Total Orders */}
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Package className="h-5 w-5 text-[#f97316]" />
            </div>
            <p className="text-sm font-medium text-[#a1a1aa]">Toplam Sipariş</p>
          </div>
          <p className="text-2xl font-bold text-white">{orders.length}</p>
          <p className="text-xs text-[#52525b] mt-1">Seçilen dönem içi kayıt</p>
        </div>

        {/* Cancelled */}
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-sm font-medium text-[#a1a1aa]">İptal Sipariş</p>
          </div>
          <p className="text-2xl font-bold text-red-500">{cancelledOrders.length}</p>
          <p className="text-xs text-[#52525b] mt-1">
            %{cancelRate.toFixed(1)} oran — ₺{cancelledSales.toFixed(2)} kayıp
          </p>
        </div>
      </div>

      {/* ─── Payment Metrics ────────────────────────────── */}
      <div className="space-y-3 shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">Ödeme &amp; Tahsilat Raporu</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-amber-500/10"><Banknote className="h-5 w-5 text-amber-500" /></div>
              <p className="text-sm font-medium text-[#a1a1aa]">Nakit</p>
            </div>
            <p className="text-2xl font-bold text-white">₺{totalCash.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-500/10"><CreditCard className="h-5 w-5 text-blue-500" /></div>
              <p className="text-sm font-medium text-[#a1a1aa]">Kart</p>
            </div>
            <p className="text-2xl font-bold text-white">₺{totalCard.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-indigo-500/10"><Wallet className="h-5 w-5 text-indigo-400" /></div>
              <p className="text-sm font-medium text-[#a1a1aa]">Yemek Kartı</p>
            </div>
            <p className="text-2xl font-bold text-white">₺{totalFoodCard.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-yellow-500/10"><Clock className="h-5 w-5 text-yellow-500" /></div>
              <p className="text-sm font-medium text-[#a1a1aa]">Bekleyen Tahsilat</p>
            </div>
            <p className="text-2xl font-bold text-yellow-500">₺{pendingPaymentSales.toFixed(2)}</p>
            <p className="text-xs text-[#52525b] mt-1">{pendingPaymentOrders.length} sipariş</p>
          </div>
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="h-5 w-5 text-red-500" /></div>
              <p className="text-sm font-medium text-[#a1a1aa]">Tahsil Edilemeyen</p>
            </div>
            <p className="text-2xl font-bold text-red-500">₺{failedPaymentSales.toFixed(2)}</p>
            <p className="text-xs text-[#52525b] mt-1">{failedPaymentOrders.length} sipariş</p>
          </div>
          {posSyncFailedOrders.length > 0 && (
            <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-orange-500/10"><AlertTriangle className="h-5 w-5 text-orange-500" /></div>
                <p className="text-sm font-medium text-[#a1a1aa]">POS Sync Hatası</p>
              </div>
              <p className="text-2xl font-bold text-orange-500">{posSyncFailedOrders.length}</p>
              <p className="text-xs text-[#52525b] mt-1">Kart ödemesi kaydedilemedi</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Platform Distribution ──────────────────────── */}
      {platformStats.length > 0 && (
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] p-5 shrink-0">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-[#f97316]" />
            <h2 className="text-sm font-semibold text-white">Sipariş Kaynakları</h2>
            <span className="ml-auto text-xs text-[#52525b]">Platform bazlı dağılım</span>
          </div>
          <div className="space-y-3">
            {platformStats.map(({ platform, count, sales }) => {
              const pct = orders.length ? ((count / orders.length) * 100) : 0;
              const color = PLATFORM_COLORS[platform] ?? '#71717a';
              return (
                <div key={platform}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white font-medium">{PLATFORM_LABELS[platform] ?? platform}</span>
                    <span className="text-[#a1a1aa]">
                      {count} sipariş ({pct.toFixed(0)}%) — ₺{sales.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#1e1e1e] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Z-Raporu Section ───────────────────────────── */}
      {!isMultiDay ? (
        /* Single day Z report */
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#71717a]">Gün Sonu Özeti</h2>
            <p className="text-xs text-[#52525b] mt-0.5">{formatDateTR(dateRange.start)} özetini panoya kopyalayın.</p>
          </div>
          <button
            onClick={handleCopySingleZReport}
            className="flex items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#141414] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1e1e1e] hover:border-[#f97316] active:scale-95"
          >
            <ClipboardCheck className={`h-4 w-4 ${copiedDay === '__single__' ? 'text-green-500' : 'text-[#f97316]'}`} />
            {copiedDay === '__single__' ? 'Kopyalandı!' : 'Z-Raporu Kopyala'}
          </button>
        </div>
      ) : dailyBreakdown.length > 0 ? (
        /* Multi-day Z report breakdown */
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] overflow-hidden shrink-0">
          <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-[#f97316]" />
            <h2 className="text-sm font-semibold text-white">Günlük Z-Raporu Dökümü</h2>
            <span className="ml-auto text-xs text-[#52525b]">{dailyBreakdown.length} gün</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1e1e1e] text-xs uppercase text-[#52525b]">
                <tr>
                  <th className="px-6 py-3 font-medium">Tarih</th>
                  <th className="px-6 py-3 font-medium text-center">Sipariş</th>
                  <th className="px-6 py-3 font-medium text-right">Ciro</th>
                  <th className="px-6 py-3 font-medium text-right">Nakit</th>
                  <th className="px-6 py-3 font-medium text-right">Kart</th>
                  <th className="px-6 py-3 font-medium text-right">Yemek K.</th>
                  <th className="px-6 py-3 font-medium text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {dailyBreakdown.map(day => (
                  <tr key={day.dateLabel} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-6 py-3 font-medium text-white">{day.dateLabel}</td>
                    <td className="px-6 py-3 text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-[#f97316]/10 px-2.5 py-0.5 text-xs font-semibold text-[#f97316]">
                        {day.orderCount}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-white">₺{day.sales.toFixed(2)}</td>
                    <td className="px-6 py-3 text-right text-amber-400">₺{day.cashCollected.toFixed(2)}</td>
                    <td className="px-6 py-3 text-right text-blue-400">₺{day.cardCollected.toFixed(2)}</td>
                    <td className="px-6 py-3 text-right text-indigo-400">₺{day.foodCardCollected.toFixed(2)}</td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => handleCopyDayZReport(day)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] px-3 py-1.5 text-xs font-medium text-white hover:border-[#f97316] transition-colors active:scale-95"
                      >
                        <ClipboardCheck className={`h-3 w-3 ${copiedDay === day.dateLabel ? 'text-green-500' : 'text-[#f97316]'}`} />
                        {copiedDay === day.dateLabel ? 'Kopyalandı!' : 'Kopyala'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ─── Courier Performance ────────────────────────── */}
      {courierStatsList.length > 0 && (
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] overflow-hidden shrink-0">
          <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center gap-2">
            <Users className="h-4 w-4 text-[#f97316]" />
            <h2 className="text-sm font-semibold text-white">Kurye Kasa &amp; Performans</h2>
            <span className="ml-auto text-xs text-[#52525b]">Seçilen dönemde teslimat yapanlar</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1e1e1e] text-xs uppercase text-[#52525b]">
                <tr>
                  <th className="px-6 py-3 font-medium">Kurye</th>
                  <th className="px-6 py-3 font-medium text-center">Teslimat</th>
                  <th className="px-6 py-3 font-medium text-center">Ort. Süre</th>
                  <th className="px-6 py-3 font-medium text-right">Nakit</th>
                  <th className="px-6 py-3 font-medium text-right">Kart / POS</th>
                  <th className="px-6 py-3 font-medium text-right">Yemek Kartı</th>
                  <th className="px-6 py-3 font-medium text-right">Toplam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {courierStatsList.map(c => (
                  <tr key={c.name} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-6 py-3 font-medium text-white">{c.name}</td>
                    <td className="px-6 py-3 text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-[#f97316]/10 px-2.5 py-0.5 text-xs font-semibold text-[#f97316]">
                        {c.deliveryCount}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {c.avgDeliveryMinutes !== null ? (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Truck className="h-3 w-3 text-purple-400" />
                          <span className="font-semibold text-purple-400">{c.avgDeliveryMinutes.toFixed(0)} dk</span>
                        </span>
                      ) : (
                        <span className="text-xs text-[#52525b]">—</span>
                      )}
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

      {/* ─── Orders Table ───────────────────────────────── */}
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] overflow-hidden flex-1 flex flex-col min-h-[400px]">
        <div className="px-6 py-5 border-b border-[#2a2a2a]">
          <h2 className="text-lg font-semibold text-white">Siparişler</h2>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left text-sm text-[#a1a1aa]">
            <thead className="bg-[#1e1e1e] text-xs uppercase text-[#52525b] sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Sipariş &amp; Tarih</th>
                <th className="px-6 py-4 font-medium">Müşteri &amp; Adres</th>
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
                    Seçilen tarih aralığında sipariş bulunamadı.
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
