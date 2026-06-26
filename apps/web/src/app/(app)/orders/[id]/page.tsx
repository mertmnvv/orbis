import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { mockOrders } from '@/lib/mock-data';
import type { OrderWithCourier } from '@/lib/types';

export const metadata: Metadata = { title: 'Sipariş Detayı — Orbis' };

// OrderMap: SSR kapalı (Google Maps + Realtime + useEffect)
const OrderMap = dynamic(
  () => import('@/components/map/OrderMap').then((m) => m.OrderMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    ),
  },
);

// Production'da: supabase.from('orders').select('*, courier:couriers(*)').eq('id', id)
async function getOrder(id: string): Promise<OrderWithCourier | null> {
  return mockOrders.find((o) => o.id === id) ?? null;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Bekliyor',     color: 'bg-yellow-100 text-yellow-700' },
  assigned:  { label: 'Kurye Atandı', color: 'bg-blue-100 text-blue-700'   },
  picked_up: { label: 'Yolda',        color: 'bg-orange-100 text-orange-700'},
  delivered: { label: 'Teslim Edildi',color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'İptal',        color: 'bg-red-100 text-red-700'     },
};

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await getOrder(params.id);

  if (!order) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-400">Sipariş bulunamadı: {params.id}</p>
      </div>
    );
  }

  const status = STATUS_MAP[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="flex h-full flex-col">
      {/* ── Başlık ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between border-b bg-white px-6 py-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">Sipariş Detayı</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.color}`}>
              {status.label}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-gray-400">#{order.id}</p>
        </div>
        <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
          {order.platform}
        </span>
      </div>

      {/* ── İçerik: sol bilgi kartları + sağ harita ───────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sol panel */}
        <div className="w-80 flex-shrink-0 overflow-y-auto border-r bg-white">
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
              <p className="text-sm text-gray-400">Kurye atanmadı</p>
            )}
          </Section>

          <Section title="Zaman Çizelgesi">
            <Timeline order={order} />
          </Section>

          <Section title="Sipariş Tutarı">
            <p className="text-lg font-bold text-gray-900">₺{order.total_amount.toFixed(2)}</p>
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
    <div className="border-b px-4 py-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex-shrink-0 text-xs text-gray-500">{label}</span>
      <span className={`text-right text-xs font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
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
              step.done ? 'bg-orange-500' : 'bg-gray-200'
            }`}
          />
          <div>
            <p className={`text-xs font-medium ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>
              {step.label}
            </p>
            {step.ts && (
              <p className="text-xs text-gray-400">
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
