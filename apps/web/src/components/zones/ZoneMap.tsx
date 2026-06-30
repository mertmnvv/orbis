'use client';

import { useEffect, useRef, useState } from 'react';
import { ZONE_COLORS, useCreateZone, type DeliveryZone } from '@/hooks/useZones';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

interface ZoneMapProps {
  zones: DeliveryZone[];
  isDrawing: boolean;
  onDrawingEnd: () => void;
  selectedId: string | null;
}

export function ZoneMap({ zones, isDrawing, onDrawingEnd, selectedId }: ZoneMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const drawRef = useRef<any>(null);
  const [pendingPolygon, setPendingPolygon] = useState<GeoJSON.Feature<GeoJSON.Polygon> | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneColor, setZoneColor] = useState(ZONE_COLORS[0]);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const createMutation = useCreateZone();

  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;

    let mapboxgl: any;
    let MapboxDraw: any;

    const init = async () => {
      try {
        mapboxgl = (await import('mapbox-gl')).default;
        mapboxgl.accessToken = MAPBOX_TOKEN;

        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [28.9795, 41.0151],
          zoom: 11,
        });

        mapRef.current = map;

        map.on('load', () => {
          // Add existing zones as layers
          zones.forEach((zone) => {
            const srcId = `zone-${zone.id}`;
            if (!map.getSource(srcId)) {
              map.addSource(srcId, { type: 'geojson', data: zone.polygon });
              map.addLayer({
                id: `${srcId}-fill`,
                type: 'fill',
                source: srcId,
                paint: {
                  'fill-color': zone.color,
                  'fill-opacity': zone.is_active ? 0.2 : 0.05,
                },
              });
              map.addLayer({
                id: `${srcId}-line`,
                type: 'line',
                source: srcId,
                paint: {
                  'line-color': zone.color,
                  'line-width': selectedId === zone.id ? 2 : 1,
                  'line-opacity': zone.is_active ? 0.8 : 0.3,
                },
              });
            }
          });
        });

      } catch (err) {
        console.error('Mapbox init error:', err);
      }
    };

    init();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update styles on selectedId change
  useEffect(() => {
    if (!mapRef.current) return;
    zones.forEach((zone) => {
      const srcId = `zone-${zone.id}`;
      try {
        if (mapRef.current.getLayer(`${srcId}-line`)) {
          mapRef.current.setPaintProperty(`${srcId}-line`, 'line-width', selectedId === zone.id ? 2 : 1);
          mapRef.current.setPaintProperty(`${srcId}-fill`, 'fill-opacity', selectedId === zone.id ? 0.4 : (zone.is_active ? 0.2 : 0.05));
        }
      } catch (e) {
        // Layer might not be loaded yet
      }
    });
  }, [selectedId, zones]);


  // Load Draw when isDrawing changes to true
  useEffect(() => {
    if (!isDrawing || !mapRef.current) return;

    const activateDraw = async () => {
      try {
        // @ts-ignore — CSS import for mapbox-gl-draw, no type declarations needed
        await import('@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css');
        const MapboxDraw = (await import('@mapbox/mapbox-gl-draw')).default;

        const draw = new MapboxDraw({
          displayControlsDefault: false,
          controls: { polygon: true, trash: true },
          defaultMode: 'draw_polygon',
          styles: [
            { id: 'gl-draw-polygon-fill', type: 'fill', filter: ['all', ['==', '$type', 'Polygon']], paint: { 'fill-color': zoneColor, 'fill-opacity': 0.2 } },
            { id: 'gl-draw-polygon-stroke', type: 'line', filter: ['all', ['==', '$type', 'Polygon']], paint: { 'line-color': zoneColor, 'line-width': 2 } },
            { id: 'gl-draw-polygon-and-line-vertex-active', type: 'circle', filter: ['all', ['==', 'meta', 'vertex']], paint: { 'circle-radius': 5, 'circle-color': '#f97316' } },
          ],
        });

        mapRef.current.addControl(draw);
        drawRef.current = draw;

        mapRef.current.on('draw.create', (e: any) => {
          const feature = e.features[0] as GeoJSON.Feature<GeoJSON.Polygon>;
          setPendingPolygon(feature);
          setShowNameDialog(true);
        });
      } catch (err) {
        console.error('MapboxDraw load error:', err);
        onDrawingEnd();
      }
    };

    activateDraw();

    return () => {
      if (drawRef.current && mapRef.current) {
        try { mapRef.current.removeControl(drawRef.current); } catch {}
        drawRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawing]);

  const handleSaveZone = async () => {
    if (!pendingPolygon || !zoneName.trim()) return;
    try {
      await createMutation.mutateAsync({ name: zoneName.trim(), polygon: pendingPolygon, color: zoneColor });
      setShowNameDialog(false);
      setPendingPolygon(null);
      setZoneName('');
      onDrawingEnd();
    } catch (err: any) {
      alert(err?.message ?? 'Bölge kaydedilemedi.');
    }
  };

  const handleCancelDraw = () => {
    setShowNameDialog(false);
    setPendingPolygon(null);
    setZoneName('');
    onDrawingEnd();
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0a0a0a]">
        <div className="text-center p-8 border border-[#2a2a2a] rounded-2xl">
          <p className="text-3xl mb-3">🗺️</p>
          <p className="text-sm font-semibold text-white mb-1">Mapbox Token Gerekli</p>
          <p className="text-xs text-[#52525b]">NEXT_PUBLIC_MAPBOX_TOKEN ortam değişkenini tanımlayın.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />

      {/* Drawing mode overlay */}
      {isDrawing && !showNameDialog && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 rounded-xl border border-[#f97316]/40 bg-[#141414]/90 backdrop-blur-sm px-4 py-2 text-sm text-[#f97316] font-medium">
          Haritada bölge çizin — noktaları tıklayın, başa tıklayarak kapatın
        </div>
      )}

      {/* Zone name dialog */}
      {showNameDialog && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-[#2a2a2a] bg-[#141414] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Bölge Adı</h3>

            <input
              type="text"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              placeholder="ör. Kadıköy Bölgesi"
              className="w-full rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] px-4 py-2.5 text-sm text-white placeholder:text-[#52525b] focus:border-[#f97316] focus:outline-none focus:ring-1 focus:ring-[#f97316] mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveZone()}
            />

            {/* Color picker */}
            <div className="mb-4">
              <p className="text-xs text-[#a1a1aa] mb-2">Bölge rengi</p>
              <div className="flex gap-2">
                {ZONE_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setZoneColor(color)}
                    className="h-7 w-7 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: color,
                      borderColor: zoneColor === color ? '#ffffff' : 'transparent',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCancelDraw}
                className="flex-1 rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] px-4 py-2 text-sm text-[#a1a1aa] hover:bg-[#2a2a2a] transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSaveZone}
                disabled={!zoneName.trim() || createMutation.isPending}
                className="flex-1 rounded-xl bg-[#f97316] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ea6c0a] transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
