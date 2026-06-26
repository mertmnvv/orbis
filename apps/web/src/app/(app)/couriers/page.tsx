import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

export const metadata: Metadata = { title: 'Kuryeler — Orbis' };

// SSR kapalı: Google Maps ve Realtime yalnızca tarayıcıda çalışır.
const CourierMap = dynamic(
  () => import('@/components/map/CourierMap').then((m) => m.CourierMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    ),
  },
);

export default function CouriersPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Başlık */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Kuryeler</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Aktif kuryelerin anlık konumları — Supabase Realtime
          </p>
        </div>
      </div>

      {/* Harita — esnek yükseklik, sidebar dışındaki alanı doldurur */}
      <div className="flex-1 overflow-hidden">
        <CourierMap />
      </div>
    </div>
  );
}
