'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  RefreshCw,
  Clock,
  Bike,
  Package,
  CheckCircle2,
  Inbox,
  ChefHat,
  Plus,
  X,
  Banknote,
  CreditCard,
  Wifi,
  AlertTriangle,
  AlertCircle,
  Wallet,
  Split,
  Link2,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderCard } from '@/components/orders/OrderCard';
import { useOrders, useRealtimeOrders } from '@/hooks/useOrders';
import { sortOrders, cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { OrderStatus, OrderWithCourier } from '@/lib/types';

const OrderMap = dynamic(
  () => import('@/components/map/OrderMap').then((m) => m.OrderMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#f97316] border-t-transparent" />
      </div>
    ),
  }
);

type FilterTab = 'active' | OrderStatus | 'pending_payment';

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'active',          label: 'Aktif' },
  { value: 'preparing',       label: 'Hazırlanıyor' },
  { value: 'pending',         label: 'Bekliyor' },
  { value: 'assigned',        label: 'Atandı' },
  { value: 'picked_up',       label: 'Yolda' },
  { value: 'delivered',       label: 'Teslim' },
  { value: 'pending_payment',  label: 'Tahsilat Bekleyenler' },
  { value: 'cancelled',       label: 'İptal' },
];

function filterOrders(orders: OrderWithCourier[], tab: FilterTab): OrderWithCourier[] {
  if (tab === 'active')
    return orders.filter((o) => ['preparing', 'pending', 'assigned', 'picked_up'].includes(o.status));
  if (tab === 'pending_payment')
    return orders.filter((o) => o.status === 'delivered' && o.payment_status === 'pending');
  return orders.filter((o) => o.status === tab);
}

function countForTab(orders: OrderWithCourier[], tab: FilterTab): number {
  return filterOrders(orders, tab).length;
}

interface StatCardProps {
  label: string;
  count: number;
  valueColor: string;
  icon: React.ReactNode;
}

function StatCard({ label, count, valueColor, icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>{count}</p>
      <p className="mt-0.5 text-xs text-[#52525b]">{label}</p>
    </div>
  );
}

interface OrderDetailModalProps {
  order: OrderWithCourier;
  onClose: () => void;
  onUpdate: () => void;
}

function OrderDetailModal({ order, onClose, onUpdate }: OrderDetailModalProps) {
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  function handleCopyTrackingLink() {
    const url = `${window.location.origin}/track/${order.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    });
  }

  async function handleAdvanceToPending() {
    setIsAdvancing(true);
    const { error } = await supabase.from('orders').update({ status: 'pending' }).eq('id', order.id);
    if (error) {
      toast.error('Durum güncellenemedi');
    } else {
      toast.success('Sipariş kuryeye hazır — Bekliyor durumuna alındı');
      onUpdate();
    }
    setIsAdvancing(false);
  }

  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    preparing: { label: 'Hazırlanıyor', color: 'bg-[#3b0764]/20 text-[#a855f7]' },
    pending:   { label: 'Bekliyor',     color: 'bg-[#78350f20] text-[#f59e0b]' },
    assigned:  { label: 'Kurye Atandı', color: 'bg-[#1e3a5f] text-[#60a5fa]'   },
    picked_up: { label: 'Yolda',        color: 'bg-[#431407] text-[#f97316]'},
    delivered: { label: 'Teslim Edildi',color: 'bg-[#14532d20] text-[#22c55e]' },
    cancelled: { label: 'İptal',        color: 'bg-[#1c1c1c] text-[#71717a]'     },
  };

  const statusStyle = STATUS_MAP[order.status] ?? { label: order.status, color: 'bg-[#1c1c1c] text-[#71717a]' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6 md:p-10 select-none">
      <div className="flex h-full max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#141414] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2a2a2a] px-6 py-4 bg-[#1a1a1a]/50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Sipariş Detayı</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle.color}`}>
              {statusStyle.label}
            </span>
            <span className="font-mono text-xs text-[#52525b]">#{order.id.slice(0, 8)}</span>
          </div>
          <div className="flex items-center gap-3">
            {order.status === 'preparing' && (
              <button
                onClick={handleAdvanceToPending}
                disabled={isAdvancing}
                className="flex items-center gap-1.5 rounded-xl bg-[#a855f7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9333ea] transition-colors disabled:opacity-50"
              >
                <ChefHat className="h-4 w-4" />
                {isAdvancing ? 'Güncelleniyor…' : 'Kuryeye Hazır'}
              </button>
            )}
            <button
              onClick={handleCopyTrackingLink}
              title="Takip linkini kopyala"
              className="flex items-center gap-1.5 rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] px-3 py-2 text-sm font-medium text-[#a1a1aa] hover:text-white hover:border-[#f97316] transition-all"
            >
              <Link2 className={`h-4 w-4 ${linkCopied ? 'text-green-400' : ''}`} />
              {linkCopied ? 'Kopyalandı!' : 'Takip Linki'}
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] p-2 text-[#a1a1aa] hover:text-white hover:bg-[#2a2a2a] transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content columns */}
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Left panel */}
          <div className="w-full md:w-80 flex-shrink-0 overflow-y-auto border-b md:border-b-0 md:border-r border-[#2a2a2a] p-4 space-y-4">
            <ModalSection title="Müşteri">
              <ModalField label="Ad" value={order.customer_name} />
              <ModalField label="Adres" value={order.customer_address} />
              {order.customer_phone && <ModalField label="Telefon" value={order.customer_phone} />}
            </ModalSection>

            <ModalSection title="Kurye">
              {order.courier ? (
                <>
                  <ModalField label="Ad" value={order.courier.name} />
                  <ModalField label="Telefon" value={order.courier.phone} />
                  <ModalField label="Araç" value={order.courier.vehicle_type} />
                </>
              ) : (
                <p className="text-xs text-[#52525b]">Kurye atanmadı</p>
              )}
            </ModalSection>

            {order.courier_status_note && (
              <ModalSection title="Kurye Notu">
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-2 text-xs text-amber-400 font-medium">
                  ⚠️ {order.courier_status_note}
                </div>
              </ModalSection>
            )}

            <ModalSection title="Ödeme ve Tutar">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#52525b]">Tutar</span>
                <span className="text-sm font-bold text-white">₺{order.total_amount.toFixed(2)}</span>
              </div>
              <ModalPaymentSection order={order} />
            </ModalSection>

            <ModalSection title="Zaman Çizelgesi">
              <ModalTimeline order={order} />
            </ModalSection>
          </div>

          {/* Right panel: map */}
          <div className="flex-1 min-h-[300px] md:min-h-0 relative">
            <OrderMap order={order} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#52525b]">
        {title}
      </h3>
      <div className="space-y-1 bg-[#1a1a1a]/30 p-2.5 rounded-lg border border-[#2a2a2a]/40">{children}</div>
    </div>
  );
}

function ModalField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5">
      <span className="flex-shrink-0 text-xs text-[#52525b]">{label}</span>
      <span className="text-right text-xs font-medium text-white">{value}</span>
    </div>
  );
}

function ModalPaymentSection({ order }: { order: OrderWithCourier }) {
  const method = order.payment_method;
  const status = order.payment_status;

  if (!method || !status) {
    return <p className="text-xs text-[#52525b]">Ödeme bilgisi yok</p>;
  }

  const methodLabel: Record<string, string> = {
    cash: 'Nakit',
    card: 'Kart',
    online_paid: 'Online Ödeme',
    food_card: 'Yemek Kartı',
    split: 'Parçalı Ödeme',
  };
  const MethodIcon = method === 'cash' ? Banknote : method === 'card' ? CreditCard : method === 'food_card' ? Wallet : method === 'split' ? Split : Wifi;
  const statusStyle: Record<string, { label: string; className: string }> = {
    not_required: { label: 'Ödeme Alınmayacak', className: 'text-emerald-400' },
    pending:      { label: 'Tahsilat Bekliyor',  className: 'text-amber-400' },
    collected:    { label: 'Tahsil Edildi',      className: 'text-emerald-400' },
    failed:       { label: 'Tahsilat Yapılamadı', className: 'text-red-400' },
  };
  const ss = statusStyle[status] ?? { label: status, className: 'text-[#a1a1aa]' };

  // Parse split details if any
  let splitDetails = null;
  let successNote = '';
  if (order.payment_notes && status === 'collected') {
    if (order.payment_notes.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(order.payment_notes);
        if (parsed.split) {
          splitDetails = parsed.split;
        }
        if (parsed.note) {
          successNote = parsed.note;
        }
      } catch {}
    } else {
      successNote = order.payment_notes;
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-[#a1a1aa]">
          <MethodIcon className="h-3 w-3" />
          {methodLabel[method] ?? method}
        </span>
        <span className={`font-semibold ${ss.className}`}>{ss.label}</span>
      </div>
      {splitDetails && (
        <div className="rounded bg-[#2a2a2a]/20 border border-[#2a2a2a]/50 p-2 text-[11px] text-[#a1a1aa] mt-2 space-y-1">
          <p className="font-semibold text-white">Parçalı Tahsilat Detayı:</p>
          {splitDetails.cash > 0 && <p>• Nakit: {splitDetails.cash.toFixed(2)} ₺</p>}
          {splitDetails.card > 0 && <p>• Kart: {splitDetails.card.toFixed(2)} ₺</p>}
          {splitDetails.food_card > 0 && <p>• Yemek Kartı: {splitDetails.food_card.toFixed(2)} ₺</p>}
          {successNote && <p className="italic mt-1 border-t border-[#2a2a2a] pt-1">Not: &quot;{successNote}&quot;</p>}
        </div>
      )}
      {status === 'failed' && (
        <div className="flex flex-col gap-1 rounded bg-red-500/10 px-2 py-1.5 text-[11px] text-red-400 mt-1.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span>Tahsil edilemedi.</span>
          </div>
          {order.payment_notes && (
            <div className="mt-1 border-t border-red-500/20 pt-1 text-[#a1a1aa] italic">
              &quot;{order.payment_notes}&quot;
            </div>
          )}
        </div>
      )}
      {status === 'collected' && !splitDetails && successNote && (
        <div className="rounded bg-[#2a2a2a]/20 border border-[#2a2a2a]/50 px-2 py-1.5 text-[11px] text-[#a1a1aa] mt-1.5 italic">
          &quot;{successNote}&quot;
        </div>
      )}
    </div>
  );
}

function ModalTimeline({ order }: { order: OrderWithCourier }) {
  const steps = [
    { label: 'Sipariş Alındı', ts: order.created_at, done: true },
    { label: 'Kurye Atandı',   ts: order.assigned_at,  done: !!order.assigned_at },
    { label: 'Yola Çıktı',     ts: order.picked_up_at, done: !!order.picked_up_at },
    { label: 'Teslim Edildi',  ts: order.delivered_at, done: !!order.delivered_at },
  ];

  return (
    <div className="space-y-1.5">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-2">
          <div
            className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
              step.done ? 'bg-[#f97316]' : 'bg-[#2a2a2a]'
            }`}
          />
          <div className="flex-1 flex items-center justify-between text-xs">
            <span className={`${step.done ? 'text-white font-medium' : 'text-[#52525b]'}`}>
              {step.label}
            </span>
            {step.ts && (
              <span className="text-[10px] text-[#52525b] font-mono">
                {new Date(step.ts).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function OrderGrid({ orders, onSelect }: { orders: OrderWithCourier[]; onSelect?: (order: OrderWithCourier) => void }) {
  if (orders.length === 0) {
    return (
      <div className="py-20 text-center flex flex-col items-center">
        <Inbox className="h-10 w-10 text-[#52525b]" />
        <p className="mt-3 text-sm text-[#52525b]">Bu kategoride sipariş yok</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} onSelect={onSelect} />
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-36 rounded-xl bg-[#1e1e1e]" />
      ))}
    </div>
  );
}

export function OrdersBoard() {
  const [activeTab, setActiveTab] = useState<FilterTab>('active');
  const { data: orders = [], isLoading, refetch, isFetching } = useOrders();
  const { isConnected } = useRealtimeOrders();
  const sorted = sortOrders(orders);

  const [selectedOrder, setSelectedOrder] = useState<OrderWithCourier | null>(null);

  const currentModalOrder = selectedOrder
    ? orders.find((o) => o.id === selectedOrder.id) || selectedOrder
    : null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Siparişler</h1>
          <p className="mt-0.5 text-sm text-[#52525b]">
            {new Date().toLocaleDateString('tr-TR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
              isConnected
                ? 'border-[#14532d40] bg-[#14532d20] text-[#22c55e]'
                : 'border-[#2a2a2a] bg-[#141414] text-[#52525b]'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isConnected ? 'animate-pulse bg-[#22c55e]' : 'bg-[#52525b]'
              }`}
            />
            {isConnected ? 'Canlı' : 'Bağlanıyor…'}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-[#2a2a2a] bg-[#141414] text-[#a1a1aa] hover:bg-[#1e1e1e] hover:text-white"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          <Link
            href="/orders/new"
            className="flex items-center gap-1.5 rounded-xl bg-[#f97316] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ea6c0a] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Yeni Sipariş
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Hazırlanıyor" count={countForTab(orders, 'preparing')} valueColor="text-[#a855f7]" icon={<ChefHat className="h-5 w-5 text-[#a855f7]" />} />
        <StatCard label="Bekliyor"      count={countForTab(orders, 'pending')}   valueColor="text-[#f59e0b]" icon={<Clock className="h-5 w-5 text-[#f59e0b]" />} />
        <StatCard label="Atandı"        count={countForTab(orders, 'assigned')}  valueColor="text-[#60a5fa]" icon={<Bike className="h-5 w-5 text-[#60a5fa]" />} />
        <StatCard label="Yolda"         count={countForTab(orders, 'picked_up')} valueColor="text-[#f97316]" icon={<Package className="h-5 w-5 text-[#f97316]" />} />
        <StatCard label="Teslim Bugün"  count={countForTab(orders, 'delivered')} valueColor="text-[#22c55e]" icon={<CheckCircle2 className="h-5 w-5 text-[#22c55e]" />} />
      </div>

      {/* Tabs + grid */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
        <div className="overflow-x-auto">
          <TabsList className="mb-4 bg-[#141414] border border-[#2a2a2a]">
            {TABS.map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#f97316] text-[#52525b] hover:text-[#a1a1aa]"
              >
                {label}
                <span className="ml-1.5 rounded-full bg-[#1e1e1e] px-1.5 py-0.5 text-xs font-medium text-[#a1a1aa]">
                  {countForTab(orders, value)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {TABS.map(({ value }) => (
          <TabsContent key={value} value={value}>
            {isLoading ? <LoadingSkeleton /> : <OrderGrid orders={filterOrders(sorted, value)} onSelect={setSelectedOrder} />}
          </TabsContent>
        ))}
      </Tabs>

      {currentModalOrder && (
        <OrderDetailModal
          order={currentModalOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={() => refetch()}
        />
      )}
    </div>
  );
}
