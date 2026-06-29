'use client';

import Link from 'next/link';
import { MapPin, CheckCircle, Banknote, CreditCard, Wifi, HelpCircle, PhoneOff, AlertTriangle, Navigation, AlertCircle, Wallet, Split, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/orders/StatusBadge';
import { PlatformBadge } from '@/components/shared/PlatformBadge';
import { cn, formatTimeAgo, formatCurrency, calcETA } from '@/lib/utils';
import type { OrderWithCourier, VehicleType, PaymentMethod, PaymentStatus } from '@/lib/types';

const VEHICLE_ICON: Record<VehicleType, string> = {
  bicycle: '🚲',
  motorcycle: '🏍',
  scooter: '🛵',
  car: '🚗',
  on_foot: '🚶',
};

const STATUS_BORDER: Record<string, string> = {
  preparing: 'border-l-[#fb923c]',
  picked_up: 'border-l-[#f97316]',
  pending:   'border-l-[#f59e0b]',
  assigned:  'border-l-[#3b82f6]',
  delivered: 'border-l-[#22c55e]',
  cancelled: 'border-l-[#2a2a2a]',
};

const PAYMENT_METHOD_ICON: Record<PaymentMethod, typeof Banknote> = {
  cash: Banknote,
  card: CreditCard,
  online_paid: Wifi,
  food_card: Wallet,
  split: Split,
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Nakit',
  card: 'Kart',
  online_paid: 'Online',
  food_card: 'Yemek Kartı',
  split: 'Parçalı',
};

const PAYMENT_STATUS_STYLE: Record<PaymentStatus, { label: string; className: string }> = {
  not_required: { label: 'Online Ödenmiş', className: 'text-emerald-400 bg-emerald-500/10' },
  pending:      { label: 'Tahsilat Bekliyor', className: 'text-amber-400 bg-amber-500/10' },
  collected:    { label: 'Tahsil Edildi', className: 'text-emerald-400 bg-emerald-500/10' },
  failed:       { label: 'Tahsilat Yapılamadı', className: 'text-red-400 bg-red-500/10' },
};

function PaymentStatusBadge({ method, status }: { method: PaymentMethod; status: PaymentStatus }) {
  const Icon = PAYMENT_METHOD_ICON[method];
  const style = PAYMENT_STATUS_STYLE[status];
  
  let label = style.label;
  if (status === 'collected') {
    label = `Tahsil Edildi (${PAYMENT_METHOD_LABEL[method]})`;
  }

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold', style.className)}>
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

function useMarkReady() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'pending' })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Sipariş kurye kuyruğuna alındı');
    },
    onError: () => {
      toast.error('İşlem başarısız');
    },
  });
}

function CourierStatusNoteBadge({ note }: { note: string }) {
  let Icon = AlertCircle;
  let className = "text-amber-400 bg-amber-500/10 border-amber-500/20";

  if (note === "Adresi bulamadım") {
    Icon = HelpCircle;
    className = "text-amber-400 bg-amber-500/10 border-amber-500/20";
  } else if (note === "Müşteriye ulaşılamıyor") {
    Icon = PhoneOff;
    className = "text-red-400 bg-red-500/10 border-red-500/20";
  } else if (note === "Yolda kaldım (Arıza)") {
    Icon = AlertTriangle;
    className = "text-red-400 bg-red-500/10 border-red-500/20";
  } else if (note === "Dönüş yolundayım") {
    Icon = Navigation;
    className = "text-blue-400 bg-blue-500/10 border-blue-500/20";
  }

  return (
    <div className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold mt-2", className)}>
      <Icon className="h-3.5 w-3.5" />
      <span>{note}</span>
    </div>
  );
}

interface OrderCardProps {
  order: OrderWithCourier;
  onSelect?: (order: OrderWithCourier) => void;
}

export function OrderCard({ order, onSelect }: OrderCardProps) {
  const eta = calcETA(order);
  const borderColor = STATUS_BORDER[order.status] ?? 'border-l-[#2a2a2a]';
  const markReady = useMarkReady();

  return (
    <div className="relative group">
      <div onClick={() => onSelect?.(order)} className="block">
        <div
          className={cn(
            'cursor-pointer border border-[#2a2a2a] bg-[#141414] transition-all duration-200 hover:bg-[#1e1e1e] hover:border-[#3a3a3a] rounded-xl border-l-4',
            borderColor,
            order.status === 'delivered' && 'opacity-60',
            order.status === 'cancelled' && 'opacity-40',
          )}
        >
          <div className="space-y-3 p-4">
            {/* Top row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <PlatformBadge platform={order.platform} />
                {order.platform_order_id && (
                  <span className="font-mono text-xs text-[#52525b]">
                    #{order.platform_order_id}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={order.status} />
                <span className="whitespace-nowrap text-xs text-[#52525b]">
                  {formatTimeAgo(order.created_at)}
                </span>
              </div>
            </div>

            {/* Customer */}
            <div>
              <p className="text-sm font-medium text-white">
                {order.customer_name}
              </p>
              <p className="mt-0.5 flex items-start gap-1 text-xs text-[#a1a1aa]">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-[#52525b]" />
                <span className="line-clamp-1">{order.customer_address}</span>
              </p>
              {order.customer_phone && (
                <p className="mt-0.5 text-xs text-[#71717a]">{order.customer_phone}</p>
              )}
            </div>

            {/* Courier status note */}
            {order.courier_status_note && (
              <CourierStatusNoteBadge note={order.courier_status_note} />
            )}

            {/* Prep time indicator for preparing orders */}
            {order.status === 'preparing' && order.estimated_ready_at && (
              <div className="rounded-lg bg-[#422006]/50 px-3 py-1.5 text-xs text-[#fb923c]">
                Tahmini hazır: {new Date(order.estimated_ready_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                {order.preparation_time_minutes && ` (~${order.preparation_time_minutes} dk)`}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[#2a2a2a] pt-2">
              <div className="text-xs text-[#a1a1aa]">
                {order.courier ? (
                  <span className="flex items-center gap-1.5">
                    <span>{VEHICLE_ICON[order.courier.vehicle_type]}</span>
                    <span className="font-medium text-white">{order.courier.name}</span>
                    {eta && (
                      <span className="text-[#52525b]">· {eta}</span>
                    )}
                  </span>
                ) : (
                  <span className={`font-medium ${order.status === 'preparing' ? 'text-[#fb923c]' : 'text-[#f59e0b]'}`}>
                    {order.status === 'preparing' ? 'Mutfakta hazırlanıyor' : 'Kurye bekleniyor'}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-semibold text-white">
                  {formatCurrency(order.total_amount)}
                </span>
                {order.payment_method && order.payment_status && (
                  <PaymentStatusBadge method={order.payment_method} status={order.payment_status} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* "Hazır" action for preparing orders — rendered outside link to avoid nesting */}
      {order.status === 'preparing' && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            markReady.mutate(order.id);
          }}
          disabled={markReady.isPending}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 py-2 text-sm font-medium text-green-400 hover:bg-green-500/20 disabled:opacity-50 transition-colors"
        >
          <CheckCircle className="h-4 w-4" />
          {markReady.isPending ? 'İşleniyor...' : 'Hazır — Kurye Kuyruğuna Al'}
        </button>
      )}

      {/* "Otomatik Ata" action for pending orders without a courier */}
      {order.status === 'pending' && !order.courier_id && (
        <AutoAssignButton orderId={order.id} />
      )}
    </div>
  );
}

function AutoAssignButton({ orderId }: { orderId: string }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function handleAutoAssign(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch('/api/orders/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Kurye atandı: ${data.courier?.name ?? 'En yakın kurye'}`);
        qc.invalidateQueries({ queryKey: ['orders'] });
      } else {
        toast.error(data.error ?? 'Atama başarısız');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleAutoAssign}
      disabled={loading}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 py-2 text-sm font-medium text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-colors"
    >
      <Zap className="h-4 w-4" />
      {loading ? 'Atanıyor...' : 'Otomatik Kurye Ata'}
    </button>
  );
}
