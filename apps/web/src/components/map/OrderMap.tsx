'use client';

import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl';
import type { LineLayer } from 'react-map-gl';
import { useState } from 'react';
import { useCourierRealtime } from '@/hooks/useCourierRealtime';
import { useRouteHistory, type LatLng } from '@/hooks/useRouteHistory';
import type { OrderWithCourier } from '@/lib/types';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

interface Props {
  order: OrderWithCourier;
}

export function OrderMap({ order }: Props) {
  if (!MAPBOX_TOKEN) {
    return <OrderMapFallback order={order} />;
  }
  return <OrderMapboxMap order={order} />;
}

// ─── Mapbox İmplementasyonu ───────────────────────────────────────────────────

function OrderMapboxMap({ order }: Props) {
  const { couriers } = useCourierRealtime();
  const route = useRouteHistory(order.courier_id);
  const [popupOpen, setPopupOpen] = useState(false);

  const courierPos = order.courier_id ? couriers.get(order.courier_id) : undefined;

  // Haritanın başlangıç merkezi: müşteri + restoran ortası
  const centerLat = order.customer_lat ? (order.customer_lat + 41.0422) / 2 : 41.0151;
  const centerLng = order.customer_lng ? (order.customer_lng + 29.0044) / 2 : 28.9795;

  const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: route.map((p) => [p.lng, p.lat]),
    },
    properties: {},
  };

  const routeLayerStyle: LineLayer = {
    id: 'route-line',
    type: 'line',
    paint: {
      'line-color': '#f97316',
      'line-width': 3,
      'line-opacity': 0.85,
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
  };

  return (
    <div className="relative h-full w-full">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ longitude: centerLng, latitude: centerLat, zoom: 13 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
      >
        <NavigationControl position="top-right" />

        {/* Rota geçmişi */}
        {route.length > 1 && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer {...routeLayerStyle} />
          </Source>
        )}

        {/* Restoran marker'ı */}
        <Marker longitude={29.0044} latitude={41.0422} anchor="bottom">
          <PinIcon color="#f97316" label="R" />
        </Marker>

        {/* Müşteri marker'ı */}
        {order.customer_lat && order.customer_lng && (
          <Marker longitude={order.customer_lng} latitude={order.customer_lat} anchor="bottom">
            <PinIcon color="#3b82f6" label="M" />
          </Marker>
        )}

        {/* Kurye marker'ı */}
        {courierPos && (
          <Marker longitude={courierPos.lng} latitude={courierPos.lat} anchor="bottom">
            <PinIcon color="#22c55e" label={courierPos.name.charAt(0).toUpperCase()} size={40} />
          </Marker>
        )}
      </Map>

      {/* Rota istatistikleri */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="flex gap-3 rounded-xl bg-[#141414]/90 backdrop-blur-sm border border-[#2a2a2a] p-3 shadow-lg">
          <Stat label="Rota Noktası" value={String(route.length)} />
          <Stat label="Kurye" value={order.courier?.name ?? '—'} accent />
          <Stat
            label="Mesafe (tahmini)"
            value={route.length > 1 ? `${approxKm(route)} km` : '—'}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Marker İkonu ─────────────────────────────────────────────────────────────

function PinIcon({
  color,
  label,
  size = 34,
}: {
  color: string;
  label: string;
  size?: number;
}) {
  const h = size * (44 / 34);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={h} viewBox="0 0 34 44">
      <path
        d="M17 0C7.6 0 0 7.6 0 17c0 12 17 27 17 27S34 29 34 17C34 7.6 26.4 0 17 0z"
        fill={color}
      />
      <circle cx="17" cy="16" r="10" fill="#141414" />
      <text
        x="17" y="21"
        fontFamily="system-ui,sans-serif"
        fontSize="10"
        fontWeight="700"
        fill={color}
        textAnchor="middle"
      >
        {label}
      </text>
    </svg>
  );
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function approxKm(route: LatLng[]): string {
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const dlat = (route[i].lat - route[i - 1].lat) * 111;
    const dlng =
      (route[i].lng - route[i - 1].lng) *
      111 *
      Math.cos(route[i].lat * (Math.PI / 180));
    total += Math.sqrt(dlat * dlat + dlng * dlng);
  }
  return total.toFixed(1);
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex-1 text-center">
      <p className={`text-sm font-bold ${accent ? 'text-[#f97316]' : 'text-white'}`}>
        {value}
      </p>
      <p className="text-xs text-[#a1a1aa]">{label}</p>
    </div>
  );
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

function OrderMapFallback({ order }: { order: OrderWithCourier }) {
  const route = useRouteHistory(order.courier_id);

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a]">
      <div className="border-b border-[#f59e0b40] bg-[#78350f20] px-4 py-2 text-xs text-[#f59e0b]">
        NEXT_PUBLIC_MAPBOX_TOKEN tanımlı değil — konumlar liste olarak gösterilmektedir.
      </div>
      <div className="flex-1 divide-y divide-[#2a2a2a] overflow-y-auto p-4 text-sm">
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
      <span className="whitespace-nowrap text-xs text-[#52525b]">{label}</span>
      <span className="text-right text-xs font-medium text-white">{value}</span>
    </div>
  );
}
