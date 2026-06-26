'use client';

/**
 * CourierMap
 *
 * Tüm aktif kuryeleri Google Maps üzerinde gösterir.
 * Supabase Realtime'dan gelen konum güncellemeleri marker'ları
 * smooth animasyon (ease-in-out interpolasyon) ile hareket ettirir.
 *
 * Google Maps API yoksa (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY tanımlı değil)
 * tablo tabanlı bir fallback gösterir.
 */

import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { useCallback, useEffect, useRef } from 'react';
import { useCourierRealtime, type CourierPosition } from '@/hooks/useCourierRealtime';

// İstanbul merkezi
const MAP_CENTER = { lat: 41.0151, lng: 28.9795 };
const MAP_OPTIONS: google.maps.MapOptions = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
  ],
};

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export function CourierMap() {
  const { couriers, isConnected } = useCourierRealtime();

  if (!MAPS_API_KEY) {
    return <CourierListFallback couriers={couriers} isConnected={isConnected} />;
  }

  return <CourierGoogleMap couriers={couriers} isConnected={isConnected} />;
}

// ─── Google Maps İmplementasyonu ──────────────────────────────────────────────

function CourierGoogleMap({
  couriers,
  isConnected,
}: {
  couriers: Map<string, CourierPosition>;
  isConnected: boolean;
}) {
  const { isLoaded } = useJsApiLoader({
    id: 'orbis-maps',
    googleMapsApiKey: MAPS_API_KEY,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    infoWindowRef.current = new google.maps.InfoWindow();
  }, []);

  const onMapUnmount = useCallback(() => {
    // Tüm marker'ları temizle
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current.clear();
    mapRef.current = null;
  }, []);

  // Kurye konumları değiştiğinde marker'ları güncelle / animasyonla taşı
  useEffect(() => {
    if (!mapRef.current) return;

    couriers.forEach((position, id) => {
      const existing = markersRef.current.get(id);
      const newPos = { lat: position.lat, lng: position.lng };

      if (existing) {
        // Mevcut marker'ı smooth animasyonla yeni konuma taşı
        const fromPos = existing.getPosition();
        if (fromPos) {
          animateMarker(existing, { lat: fromPos.lat(), lng: fromPos.lng() }, newPos);
        } else {
          existing.setPosition(newPos);
        }
        // Başlık güncelle
        existing.setTitle(
          `${position.name} — ${formatLastSeen(position.lastSeenAt)}`,
        );
      } else {
        // Yeni marker oluştur
        const marker = new google.maps.Marker({
          position: newPos,
          map: mapRef.current!,
          title: position.name,
          icon: makeCourierIcon(position.name),
          optimized: false, // Animasyon için gerekli
        });

        marker.addListener('click', () => {
          infoWindowRef.current?.setContent(makeInfoContent(position));
          infoWindowRef.current?.open(mapRef.current!, marker);
        });

        markersRef.current.set(id, marker);
      }
    });

    // Artık aktif olmayan kuryelerin marker'larını kaldır
    markersRef.current.forEach((marker, id) => {
      if (!couriers.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });
  }, [couriers]);

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400 animate-pulse">Harita yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={MAP_CENTER}
        zoom={13}
        options={MAP_OPTIONS}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
      />
      <RealtimeBadge isConnected={isConnected} count={couriers.size} />
    </div>
  );
}

// ─── Animasyon ────────────────────────────────────────────────────────────────

/**
 * Google Maps Marker'ını eski konumdan yeni konuma ease-in-out ile taşır.
 * requestAnimationFrame kullanarak 60fps'e kadar smooth hareket sağlar.
 */
function animateMarker(
  marker: google.maps.Marker,
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  durationMs = 900,
): void {
  const startTime = performance.now();
  const latDelta = to.lat - from.lat;
  const lngDelta = to.lng - from.lng;

  // Çok küçük hareketleri animasyon yapmadan doğrudan uygula
  if (Math.abs(latDelta) < 1e-7 && Math.abs(lngDelta) < 1e-7) {
    marker.setPosition(to);
    return;
  }

  function step(now: number): void {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / durationMs, 1);
    const eased = easeInOut(t);

    marker.setPosition({
      lat: from.lat + latDelta * eased,
      lng: from.lng + lngDelta * eased,
    });

    if (t < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// ─── Marker İkon & İçerik ────────────────────────────────────────────────────

function makeCourierIcon(name: string): google.maps.Icon {
  const initial = name.charAt(0).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
      <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/></filter>
      <path d="M20 0C9 0 0 9 0 20c0 14 20 32 20 32S40 34 40 20C40 9 31 0 20 0z"
            fill="#f97316" filter="url(#shadow)"/>
      <circle cx="20" cy="19" r="13" fill="white"/>
      <text x="20" y="24" font-family="system-ui,sans-serif" font-size="13"
            font-weight="700" fill="#f97316" text-anchor="middle">${initial}</text>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(40, 52),
    anchor: new google.maps.Point(20, 52),
  };
}

function makeInfoContent(pos: CourierPosition): string {
  return `
    <div style="font-family:system-ui,sans-serif;padding:4px 8px;min-width:140px">
      <p style="font-weight:700;margin:0 0 4px">${pos.name}</p>
      <p style="font-size:12px;color:#6b7280;margin:0">
        Son görülme: ${formatLastSeen(pos.lastSeenAt)}
      </p>
      <p style="font-size:11px;color:#9ca3af;margin:4px 0 0">
        ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}
      </p>
    </div>`;
}

function formatLastSeen(ts: string | null): string {
  if (!ts) return 'Bilinmiyor';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60_000);
  if (diff < 1) return 'Şimdi';
  if (diff < 60) return `${diff} dk önce`;
  return `${Math.floor(diff / 60)} sa önce`;
}

// ─── Realtime Badge ───────────────────────────────────────────────────────────

function RealtimeBadge({ isConnected, count }: { isConnected: boolean; count: number }) {
  return (
    <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-md">
      <span
        className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}
      />
      <span className="text-xs font-semibold text-gray-700">
        {isConnected ? `${count} kurye canlı` : 'Bağlanıyor…'}
      </span>
    </div>
  );
}

// ─── Fallback: API Key Yoksa ─────────────────────────────────────────────────

function CourierListFallback({
  couriers,
  isConnected,
}: {
  couriers: Map<string, CourierPosition>;
  isConnected: boolean;
}) {
  const list = Array.from(couriers.values());

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-amber-50 px-4 py-2 text-xs text-amber-700">
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY tanımlı değil — harita yerine liste gösteriliyor.
      </div>
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
        <span className="text-xs font-medium text-gray-600">
          {isConnected ? 'Realtime bağlı' : 'Bağlanıyor…'}
        </span>
      </div>
      <div className="divide-y overflow-y-auto">
        {list.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-400">Aktif kurye yok.</p>
        )}
        {list.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
              {c.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
              <p className="text-xs text-gray-500 font-mono">
                {c.lat.toFixed(5)}, {c.lng.toFixed(5)}
              </p>
            </div>
            <span className="text-xs text-gray-400">{formatLastSeen(c.lastSeenAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
