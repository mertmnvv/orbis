'use client';

import Map, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl';
import type { FillLayer, LineLayer } from 'react-map-gl';
import { useState } from 'react';
import { useCourierRealtime, type CourierPosition } from '@/hooks/useCourierRealtime';
import { useZones } from '@/hooks/useZones';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

export function CourierMap() {
  const { couriers, isConnected } = useCourierRealtime();

  if (!MAPBOX_TOKEN) {
    return <CourierListFallback couriers={couriers} isConnected={isConnected} />;
  }

  return <CourierMapboxMap couriers={couriers} isConnected={isConnected} />;
}

// ─── Mapbox İmplementasyonu ───────────────────────────────────────────────────

function CourierMapboxMap({
  couriers,
  isConnected,
}: {
  couriers: Map<string, CourierPosition>;
  isConnected: boolean;
}) {
  const [popup, setPopup] = useState<CourierPosition | null>(null);
  const list = Array.from(couriers.values());
  const { data: zones } = useZones();
  const activeZones = (zones ?? []).filter((z) => z.is_active);

  return (
    <div className="relative h-full w-full">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ longitude: 28.9795, latitude: 41.0151, zoom: 13 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        onClick={() => setPopup(null)}
      >
        <NavigationControl position="top-right" />

        {/* Zone katmanları */}
        {activeZones.map((zone) => {
          const fillStyle: FillLayer = {
            id: `zone-fill-${zone.id}`,
            type: 'fill',
            paint: { 'fill-color': zone.color, 'fill-opacity': 0.15 },
          };
          const lineStyle: LineLayer = {
            id: `zone-line-${zone.id}`,
            type: 'line',
            paint: { 'line-color': zone.color, 'line-width': 1.5, 'line-opacity': 0.6 },
          };
          return (
            <Source key={zone.id} id={`zone-${zone.id}`} type="geojson" data={zone.polygon}>
              <Layer {...fillStyle} />
              <Layer {...lineStyle} />
            </Source>
          );
        })}

        {list.map((c) => (
          <Marker key={c.id} longitude={c.lng} latitude={c.lat} anchor="bottom">
            <div
              className="cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setPopup(c); }}
            >
              <CourierPin name={c.name} isActive={c.isActive} />
            </div>
          </Marker>
        ))}

        {popup && (
          <Popup
            longitude={popup.lng}
            latitude={popup.lat}
            anchor="bottom"
            offset={52}
            closeButton={false}
            onClose={() => setPopup(null)}
          >
            <div style={{
              fontFamily: 'system-ui',
              padding: '8px 4px',
              minWidth: 160,
              background: '#141414',
              borderRadius: 8,
              border: '1px solid #2a2a2a',
            }}>
              <p style={{ fontWeight: 700, margin: '0 0 4px', color: '#ffffff', fontSize: 14 }}>{popup.name}</p>
              <p style={{ fontSize: 12, color: '#a1a1aa', margin: '0 0 4px' }}>
                Son görülme: {formatLastSeen(popup.lastSeenAt)}
              </p>
              <p style={{ fontSize: 11, color: '#52525b', margin: 0, fontFamily: 'monospace' }}>
                {popup.lat.toFixed(5)}, {popup.lng.toFixed(5)}
              </p>
            </div>
          </Popup>
        )}
      </Map>

      <RealtimeBadge isConnected={isConnected} count={list.length} />

      {/* Left panel: courier list */}
      {list.length > 0 && (
        <div className="absolute left-4 top-14 z-10 w-52 rounded-xl border border-[#2a2a2a] bg-[#141414]/90 backdrop-blur-sm overflow-hidden">
          <div className="border-b border-[#2a2a2a] px-3 py-2">
            <p className="text-xs font-semibold text-[#a1a1aa]">Aktif Kuryeler</p>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-[#2a2a2a]">
            {list.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-[#1e1e1e] transition-colors"
                onClick={() => setPopup(c)}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-xs font-bold text-white">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">{c.name}</p>
                  <p className="text-xs text-[#52525b]">{formatLastSeen(c.lastSeenAt)}</p>
                </div>
                <div className={`h-2 w-2 rounded-full shrink-0 ${c.isActive ? 'bg-[#22c55e] animate-pulse' : 'bg-[#2a2a2a]'}`} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Marker İkonu ─────────────────────────────────────────────────────────────

function CourierPin({ name, isActive }: { name: string; isActive?: boolean }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
      <filter id="shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.5" />
      </filter>
      <path
        d="M20 0C9 0 0 9 0 20c0 14 20 32 20 32S40 34 40 20C40 9 31 0 20 0z"
        fill={isActive ? '#f97316' : '#52525b'}
        filter="url(#shadow)"
      />
      <circle cx="20" cy="19" r="13" fill="#141414" />
      <text
        x="20" y="24"
        fontFamily="system-ui,sans-serif"
        fontSize="13"
        fontWeight="700"
        fill={isActive ? '#f97316' : '#a1a1aa'}
        textAnchor="middle"
      >
        {initial}
      </text>
    </svg>
  );
}

// ─── Realtime Badge ───────────────────────────────────────────────────────────

function RealtimeBadge({ isConnected, count }: { isConnected: boolean; count: number }) {
  return (
    <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#141414]/90 backdrop-blur-sm px-3 py-1.5 shadow-lg">
      <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-[#22c55e] animate-pulse' : 'bg-[#52525b]'}`} />
      <span className="text-xs font-semibold text-white">
        {isConnected ? `${count} kurye canlı` : 'Bağlanıyor…'}
      </span>
    </div>
  );
}

// ─── Fallback: Token Yoksa ────────────────────────────────────────────────────

function CourierListFallback({
  couriers,
  isConnected,
}: {
  couriers: Map<string, CourierPosition>;
  isConnected: boolean;
}) {
  const list = Array.from(couriers.values());

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a]">
      <div className="border-b border-[#f59e0b40] bg-[#78350f20] px-4 py-2 text-xs text-[#f59e0b]">
        NEXT_PUBLIC_MAPBOX_TOKEN tanımlı değil — harita yerine liste gösteriliyor.
      </div>
      <div className="flex items-center gap-2 border-b border-[#2a2a2a] px-4 py-2">
        <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-[#22c55e] animate-pulse' : 'bg-[#52525b]'}`} />
        <span className="text-xs font-medium text-[#a1a1aa]">
          {isConnected ? 'Realtime bağlı' : 'Bağlanıyor…'}
        </span>
      </div>
      <div className="divide-y divide-[#2a2a2a] overflow-y-auto">
        {list.length === 0 && (
          <p className="p-6 text-center text-sm text-[#52525b]">Aktif kurye yok.</p>
        )}
        {list.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#141414] transition-colors">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f97316] text-sm font-bold text-white">
              {c.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{c.name}</p>
              <p className="font-mono text-xs text-[#52525b]">
                {c.lat.toFixed(5)}, {c.lng.toFixed(5)}
              </p>
            </div>
            <span className="text-xs text-[#52525b]">{formatLastSeen(c.lastSeenAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Yardımcı ─────────────────────────────────────────────────────────────────

function formatLastSeen(ts: string | null): string {
  if (!ts) return 'Bilinmiyor';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60_000);
  if (diff < 1) return 'Şimdi';
  if (diff < 60) return `${diff} dk önce`;
  return `${Math.floor(diff / 60)} sa önce`;
}
