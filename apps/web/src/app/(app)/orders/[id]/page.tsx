'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChefHat, Banknote, CreditCard, Wifi, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { OrderWithCourier } from '@/lib/types';

// OrderMap: SSR kapalı (Google Maps + Realtime + useEffect)
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

export default function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [order, setOrder] = useState<OrderWithCourier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdvancing, setIsAdvancing] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          courier:couriers (
            id, user_id, name, phone, vehicle_type,
            is_active, current_lat, current_lng, last_seen_at, created_at
          ),
          restaurant:restaurants (name)
        `)
        .eq('id', params.id)
        .single();

      if (!error && data) {
        setOrder(data as OrderWithCourier);
      }
      setIsLoading(false);
    }
    fetchOrder();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#f97316] border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#0a0a0a]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 mb-2">
          <span className="text-xl">⚠️</span>
        </div>
        <p className="text-[#a1a1aa] font-medium text-lg">Sipariş bulunamadı</p>
        <p className="text-sm text-[#52525b] max-w-md text-center">
          Bu sipariş silinmiş veya geçerliliğini yitirmiş olabilir. Panodaki (Kanban) kayıtlar otomatik güncellenerek bu tür siparişler düşecektir.
        </p>
        <p className="text-xs font-mono text-[#52525b] mt-1 mb-4">{params.id}</p>
        
        <Link 
          href="/orders" 
          className="rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2a2a2a] transition-colors"
        >
          Siparişlere Dön
        </Link>
      </div>
    );
  }

  async function handleAdvanceToPending() {
    if (!order) return;
    setIsAdvancing(true);
    const { error } = await supabase.from('orders').update({ status: 'pending' }).eq('id', order.id);
    if (error) {
      toast.error('Durum güncellenemedi');
    } else {
      setOrder({ ...order, status: 'pending' });
      toast.success('Sipariş kuryeye hazır — Bekliyor durumuna alındı');
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

  const status = STATUS_MAP[order.status] ?? { label: order.status, color: 'bg-[#1c1c1c] text-[#71717a]' };

  return (
    <div className="flex h-full flex-col">
      {/* ── Başlık ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between border-b border-[#2a2a2a] bg-[#141414] px-6 py-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white">Sipariş Detayı</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.color}`}>
              {status.label}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-[#52525b]">#{order.id}</p>
        </div>
        <div className="flex items-center gap-2">
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
          <span className="rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] px-3 py-1 text-xs font-medium text-[#a1a1aa]">
            {order.platform}
          </span>
        </div>
      </div>

      {/* ── İçerik: sol bilgi kartları + sağ harita ───────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sol panel */}
        <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-[#2a2a2a] bg-[#141414]">
          <Section title="Müşteri">
            <Field label="Ad" value={order.customer_name} />
            <Field label="Adres" value={order.customer_address} />
            {order.customer_lat && (
              <Field
                label="Koordinat"
                value={`${order.customer_lat.toFixed(5)}, ${order.customer_lng?.toFixed(5)}`}
                mono
              />
            )}
          </Section>

          <Section title="Kurye">
            {order.courier ? (
              <>
                <Field label="Ad" value={order.courier.name} />
                <Field label="Telefon" value={order.courier.phone} />
                <Field label="Araç" value={order.courier.vehicle_type} />
                <Field
                  label="Son Konum"
                  value={
                    order.courier.current_lat
                      ? `${order.courier.current_lat.toFixed(5)}, ${order.courier.current_lng?.toFixed(5)}`
                      : '—'
                  }
                  mono
                />
              </>
            ) : (
              <p className="text-sm text-[#52525b]">Kurye atanmadı</p>
            )}
          </Section>

          <Section title="Zaman Çizelgesi">
            <Timeline order={order} />
          </Section>

          <Section title="Sipariş Tutarı">
            <p className="text-lg font-bold text-white">₺{order.total_amount.toFixed(2)}</p>
          </Section>

          <Section title="Ödeme">
            <PaymentSection order={order} />
          </Section>
        </div>

        {/* Sağ panel: harita */}
        <div className="flex-1 overflow-hidden">
          <OrderMap order={order} />
        </div>
      </div>
    </div>
  );
}

// ─── Alt Bileşenler ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[#2a2a2a] px-4 py-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#52525b]">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex-shrink-0 text-xs text-[#52525b]">{label}</span>
      <span className={`text-right text-xs font-medium text-white ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function PaymentSection({ order }: { order: OrderWithCourier }) {
  const method = order.payment_method;
  const status = order.payment_status;

  if (!method || !status) {
    return <p className="text-xs text-[#52525b]">Ödeme bilgisi yok</p>;
  }

  const methodLabel: Record<string, string> = { cash: 'Nakit', card: 'Kart', online_paid: 'Online Ödeme' };
  const MethodIcon = method === 'cash' ? Banknote : method === 'card' ? CreditCard : Wifi;
  const statusStyle: Record<string, { label: string; className: string }> = {
    not_required: { label: 'Ödeme Alınmayacak', className: 'text-emerald-400' },
    pending:      { label: 'Tahsilat Bekliyor',  className: 'text-amber-400' },
    collected:    { label: 'Tahsil Edildi',      className: 'text-emerald-400' },
    failed:       { label: 'Tahsilat Yapılamadı', className: 'text-red-400' },
  };
  const ss = statusStyle[status] ?? { label: status, className: 'text-[#a1a1aa]' };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-[#52525b]">
          <MethodIcon className="h-3.5 w-3.5" />
          {methodLabel[method] ?? method}
        </span>
        <span className={`text-xs font-semibold ${ss.className}`}>{ss.label}</span>
      </div>
      {order.payment_collected_at && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#52525b]">Tahsilat Zamanı</span>
          <span className="font-mono text-xs text-white">
            {new Date(order.payment_collected_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
      {status === 'failed' && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-2 text-xs text-red-400">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Kurye ödemeyi tahsil edemedi.</span>
          </div>
          {order.payment_notes && (
            <div className="mt-1 border-t border-red-500/20 pt-1 text-[#a1a1aa] italic">
              Gerekçe: {order.payment_notes}
            </div>
          )}
        </div>
      )}
      {status !== 'failed' && order.payment_notes && (
        <div className="rounded-lg bg-[#2a2a2a]/30 border border-[#2a2a2a] px-2.5 py-2 text-xs text-[#a1a1aa] mt-2">
          <p className="font-semibold text-white mb-0.5">Kurye Notu:</p>
          <p className="italic">"{order.payment_notes}"</p>
        </div>
      )}
    </div>
  );
}

function Timeline({ order }: { order: OrderWithCourier }) {
  const steps = [
    { label: 'Sipariş Alındı', ts: order.created_at, done: true },
    { label: 'Kurye Atandı',   ts: order.assigned_at,  done: !!order.assigned_at },
    { label: 'Yola Çıktı',     ts: order.picked_up_at, done: !!order.picked_up_at },
    { label: 'Teslim Edildi',  ts: order.delivered_at, done: !!order.delivered_at },
  ];

  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-2">
          <div
            className={`mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
              step.done ? 'bg-[#f97316]' : 'bg-[#2a2a2a]'
            }`}
          />
          <div>
            <p className={`text-xs font-medium ${step.done ? 'text-white' : 'text-[#52525b]'}`}>
              {step.label}
            </p>
            {step.ts && (
              <p className="text-xs text-[#52525b]">
                {new Date(step.ts).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
