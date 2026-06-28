import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

export const metadata: Metadata = { title: 'Kuryeler — Orbis' };

const CouriersPanel = dynamic(
  () => import('@/components/couriers/CouriersPanel').then((m) => m.CouriersPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    ),
  },
);

export default function CouriersPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Başlık */}
      <div className="flex items-center justify-between border-b border-[#2a2a2a] bg-[#121212] px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Kuryeler</h1>
          <p className="mt-0.5 text-sm text-[#a1a1aa]">
            Restoranınıza bağlı kuryelerin durumu ve yönetimi
          </p>
        </div>
      </div>

      {/* Kuryeler Listesi ve Yönetim Paneli */}
      <div className="flex-1 overflow-auto p-6">
        <CouriersPanel />
      </div>
    </div>
  );
}
