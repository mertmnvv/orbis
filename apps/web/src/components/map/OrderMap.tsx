'use client';

/**
 * OrderMap
 *
 * Sipariş detay sayfası için harita bileşeni.
 * — Restoran marker'ı (turuncu pin)
 * — Müşteri marker'ı (mavi pin)
 * — Kurye marker'ı (yeşil, smooth animasyonlu)
 * — Kurye rota geçmişi (turuncu polyline, Realtime ile uzar)
 *
 * API key yoksa konum tablosu fallback'i gösterilir.
 */

import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { useCallback, useEffect, useRef } from 'react';
import { useCourierRealtime } from '@/hooks/useCourierRealtime';
import { useRouteHistory, type LatLng } from '@/hooks/useRouteHistory';
import type { OrderWithCourier } from '@/lib/types';

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

interface Props {
  order: OrderWithCourier;
}

export function OrderMap({ order }: Props) {
  if (!MAPS_API_KEY) {
    return <OrderMapFallback order={order} />;
  }
  return <OrderGoogleMap order={order} />;
}

// ─── Google Maps İmplementasyonu ──────────────────────────────────────────────

function OrderGoogleMap({ order }: Props) {
  const { isLoaded } = useJsApiLoader({
    id: 'orbis-maps',
    googleMapsApiKey: MAPS_API_KEY,
  });

  const { couriers } = useCourierRealtime();
  const route = useRouteHistory(order.courier_id);

  const mapRef = useRef<google.maps.Map | null>(null);
  const courierMarkerRef = useRef<google.maps.Marker | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const restaurantMarkerRef = useRef<google.maps.Marker | null>(null);
  const customerMarkerRef = useRef<google.maps.Marker | null>(null);

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;

      // Restoran marker'ı (turuncu)
      if (order.restaurant_id) {
        restaurantMarkerRef.current = new google.maps.Marker({
          map,
          position: { lat: 41.0422, lng: 29.0044 }, // Gerçekte: restaurant.lat/lng
          icon: makePinIcon('#f97316', 'R'),
          title: 'Restoran',
          zIndex: 1,
        });
      }

      // Müşteri marker'ı (mavi)
      if (order.customer_lat && order.customer_lng) {
        customerMarkerRef.current = new google.maps.Marker({
          map,
          position: { lat: order.customer_lat, lng: order.customer_lng },
          icon: makePinIcon('#3b82f6', 'M'),
          title: order.customer_name,
          zIndex: 1,
        });
      }

      // Rota polyline
      polylineRef.current = new google.maps.Polyline({
        map,
        path: [],
        strokeColor: '#f97316',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        geodesic: true,
        icons: [
          {
            icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2.5 },
            offset: '100%',
            repeat: '80px',
          },
        ],
      });

      // Haritayı müşteri + restoran sınırlarına sığdır
      const bounds = new google.maps.LatLngBounds();
      if (order.customer_lat && order.customer_lng) {
        bounds.extend({ lat: order.customer_lat, lng: order.customer_lng });
      }
      // Restoran için örnek konum (gerçekte restaurant join'dan gelir)
      bounds.extend({ lat: 41.0422, lng: 29.0044 });
      map.fitBounds(bounds, 80);
    },
    [order],
  );

  const onMapUnmount = useCallback(() => {
    courierMarkerRef.current?.setMap(null);
    polylineRef.current?.setMap(null);
    restaurantMarkerRef.current?.setMap(null);
    customerMarkerRef.current?.setMap(null);
    mapRef.current = null;
  }, []);

  // Kurye konumu değiştiğinde marker'ı animasyonla taşı
  useEffect(() => {
    if (!mapRef.current || !order.courier_id) return;
    const courierPos = couriers.get(order.courier_id);
    if (!courierPos) return;

    const newPos = { lat: courierPos.lat, lng: courierPos.lng };

    if (courierMarkerRef.current) {
      const from = courierMarkerRef.current.getPosition();
      if (from) {
        animateMarker(
          courierMarkerRef.current,
          { lat: from.lat(), lng: from.lng() },
          newPos,
        );
      } else {
        courierMarkerRef.current.setPosition(newPos);
      }
    } else {
      courierMarkerRef.current = new google.maps.Marker({
        position: newPos,
        map: mapRef.current!,
        icon: makeCourierPin(courierPos.name),
        title: courierPos.name,
        zIndex: 10,
        optimized: false,
      });
    }
  }, [couriers, order.courier_id]);

  // Rota noktaları geldiğinde polyline'ı güncelle
  useEffect(() => {
    if (!polylineRef.current || route.length === 0) return;
    polylineRef.current.setPath(
      route.map((p) => new google.maps.LatLng(p.lat, p.lng)),
    );
  }, [route]);

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
        zoom={14}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
      />
      {/* Rota istatistikleri */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="flex gap-3 rounded-xl bg-white p-3 shadow-lg">
          <Stat label="Rota Noktası" value={String(route.length)} />
          <Stat
            label="Kurye Durumu"
            value={order.courier?.name ?? '—'}
            accent
          />
          <Stat
            label="Mesafe (tahmini)"
            value={route.length > 1 ? `${approxKm(route)} km` : '—'}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Animasyon (CourierMap ile aynı mantık) ───────────────────────────────────

function animateMarker(
  marker: google.maps.Marker,
  from: LatLng,
  to: LatLng,
  durationMs = 900,
): void {
  const startTime = performance.now();
  const dlat = to.lat - from.lat;
  const dlng = to.lng - from.lng;
  if (Math.abs(dlat) < 1e-7 && Math.abs(dlng) < 1e-7) {
    marker.setPosition(to);
    return;
  }
  function step(now: number) {
    const t = Math.min((now - startTime) / durationMs, 1);
    const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    marker.setPosition({ lat: from.lat + dlat * e, lng: from.lng + dlng * e });
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ─── İkon Fabrikaları ─────────────────────────────────────────────────────────

function makePinIcon(color: string, label: string): google.maps.Icon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
      <path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 27 17 27S34 29 34 17C34 7.6 26.4 0 17 0z" fill="${color}"/>
      <circle cx="17" cy="16" r="10" fill="white"/>
      <text x="17" y="21" font-family="system-ui,sans-serif" font-size="10"
            font-weight="700" fill="${color}" text-anchor="middle">${label}</text>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(34, 44),
    anchor: new google.maps.Point(17, 44),
  };
}

function makeCourierPin(name: string): google.maps.Icon {
  const initial = name.charAt(0).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
      <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/></filter>
      <path d="M20 0C9 0 0 9 0 20c0 14 20 32 20 32S40 34 40 20C40 9 31 0 20 0z"
            fill="#22c55e" filter="url(#s)"/>
      <circle cx="20" cy="19" r="13" fill="white"/>
      <text x="20" y="24" font-family="system-ui,sans-serif" font-size="13"
            font-weight="700" fill="#16a34a" text-anchor="middle">${initial}</text>
    </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(40, 52),
    anchor: new google.maps.Point(20, 52),
  };
}

// ─── Yardımcı ────────────────────────────────────────────────────────────────

function approxKm(route: LatLng[]): string {
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const dlat = (route[i].lat - route[i - 1].lat) * 111;
    const dlng = (route[i].lng - route[i - 1].lng) * 111 * Math.cos(route[i].lat * (Math.PI / 180));
    total += Math.sqrt(dlat * dlat + dlng * dlng);
  }
  return total.toFixed(1);
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex-1 text-center">
      <p className={`text-sm font-bold ${accent ? 'text-orange-500' : 'text-gray-900'}`}>
        {value}
      </p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

function OrderMapFallback({ order }: { order: OrderWithCourier }) {
  const route = useRouteHistory(order.courier_id);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-amber-50 px-4 py-2 text-xs text-amber-700">
        Google Maps API key eksik — konumlar liste olarak gösterilmektedir.
      </div>
      <div className="flex-1 overflow-y-auto divide-y text-sm p-4 space-y-3">
        <InfoRow label="Müşteri" value={order.customer_name} />
        <InfoRow label="Adres" value={order.customer_address} />
        {order.customer_lat && (
          <InfoRow
            label="Koordinat"
            value={`${order.customer_lat.toFixed(5)}, ${order.customer_lng?.toFixed(5)}`}
          />
        )}
        <InfoRow label="Kurye" value={order.courier?.name ?? '—'} />
        <InfoRow label="Rota Noktası" value={String(route.length)} />
        {route.length > 0 && (
          <InfoRow
            label="Son Konum"
            value={`${route[route.length - 1].lat.toFixed(5)}, ${route[route.length - 1].lng.toFixed(5)}`}
          />
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="text-gray-500 text-xs whitespace-nowrap">{label}</span>
      <span className="text-gray-900 text-xs font-medium text-right">{value}</span>
    </div>
  );
}
