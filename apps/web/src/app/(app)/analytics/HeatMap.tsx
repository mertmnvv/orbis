'use client';

import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl';
import type { CircleLayer } from 'react-map-gl';
import { useMemo, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

interface Point { lat: number; lng: number }

interface Props {
  points: Point[];
}

export default function HeatMap({ points }: Props) {
  const [viewState, setViewState] = useState(() => {
    const avgLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const avgLng = points.reduce((s, p) => s + p.lng, 0) / points.length;
    return { latitude: avgLat, longitude: avgLng, zoom: 11 };
  });

  const geojson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: points.map(p => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      properties: {},
    })),
  }), [points]);

  const heatmapLayer = {
    id: 'delivery-heat',
    type: 'heatmap',
    paint: {
      'heatmap-weight': 1,
      'heatmap-intensity': 1.5,
      'heatmap-radius': 20,
      'heatmap-opacity': 0.8,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,   'rgba(0,0,0,0)',
        0.2, 'rgba(249,115,22,0.3)',
        0.4, 'rgba(249,115,22,0.6)',
        0.6, 'rgba(251,146,60,0.8)',
        0.8, 'rgba(253,186,116,0.9)',
        1,   'rgba(255,237,213,1)',
      ],
    },
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="h-64 bg-[#0f0f0f] rounded-xl flex items-center justify-center">
        <p className="text-[#52525b] text-sm">Mapbox token ayarlanmamış — NEXT_PUBLIC_MAPBOX_TOKEN gerekli</p>
      </div>
    );
  }

  return (
    <div className="h-72 rounded-xl overflow-hidden">
      <Map
        {...viewState}
        onMove={e => setViewState(e.viewState)}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        <Source id="deliveries" type="geojson" data={geojson}>
          <Layer {...(heatmapLayer as any)} />
        </Source>
      </Map>
    </div>
  );
}
