import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Ayarlar — Orbis' };

export default function SettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900">Ayarlar</h1>
      <p className="mt-6 text-sm text-gray-400">
        Bu sayfa yakında eklenecek — restoran profili ve platform webhook URL'leri burada görünecek.
      </p>
    </div>
  );
}
