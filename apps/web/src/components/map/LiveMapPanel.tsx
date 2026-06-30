'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Map, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl';
import type { FillLayer, LineLayer } from 'react-map-gl';
import { useCourierRealtime, type CourierPosition } from '@/hooks/useCourierRealtime';
import { useZones } from '@/hooks/useZones';
import { supabase } from '@/lib/supabase';
import { Store, User, Bike, MapPin, Navigation, Eye, CheckCircle2, RefreshCw } from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

interface ActiveOrder {
  id: string;
  status: string;
  customer_name: string;
  customer_address: string;
  customer_lat: number;
  customer_lng: number;
  platform: string;
  total_amount: number;
  courier_id: string | null;
}

interface RestaurantInfo {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  yemeksepeti: '#ef4444',
  getir: '#a855f7',
  trendyol: '#f97316',
  pakettaksi: '#3b82f6',
  manual: '#22c55e',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  preparing: 'Hazırlanıyor',
  assigned: 'Atandı',
  picked_up: 'Yolda',
};

export function LiveMapPanel() {
  const { couriers, isConnected: isCourierConnected } = useCourierRealtime();
  const { data: zones } = useZones();
  
  const mapRef = useRef<any>(null);
  
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [isOrdersConnected, setIsOrdersConnected] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<CourierPosition | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ActiveOrder | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<boolean>(false);
  
  const [showCouriers, setShowCouriers] = useState(true);
  const [showCustomers, setShowCustomers] = useState(true);
  const [showZones, setShowZones] = useState(true);

  // 1. Fetch Restaurant & Active Orders
  useEffect(() => {
    // Fetch Restaurant
    supabase
      .from('restaurants')
      .select('name, address, lat, lng')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.lat !== null && data.lng !== null) {
          setRestaurant({
            name: data.name,
            address: data.address,
            lat: Number(data.lat),
            lng: Number(data.lng),
          });
        }
      });

    // Fetch Active Orders
    supabase
      .from('orders')
      .select('id, status, customer_name, customer_address, customer_lat, customer_lng, platform, total_amount, courier_id')
      .in('status', ['preparing', 'pending', 'assigned', 'picked_up'])
      .then(({ data }) => {
        if (data) {
          setActiveOrders(
            data.map((o) => ({
              ...o,
              customer_lat: Number(o.customer_lat),
              customer_lng: Number(o.customer_lng),
              total_amount: Number(o.total_amount),
            }))
          );
        }
      });

    // Subscribe to Orders changes
    const channel = supabase
      .channel('live-map-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setActiveOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
          } else {
            const order = payload.new as any;
            if (['preparing', 'pending', 'assigned', 'picked_up'].includes(order.status)) {
              const formatted: ActiveOrder = {
                id: order.id,
                status: order.status,
                customer_name: order.customer_name,
                customer_address: order.customer_address,
                customer_lat: Number(order.customer_lat),
                customer_lng: Number(order.customer_lng),
                platform: order.platform,
                total_amount: Number(order.total_amount),
                courier_id: order.courier_id,
              };
              setActiveOrders((prev) => {
                const idx = prev.findIndex((o) => o.id === order.id);
                if (idx > -1) {
                  const next = [...prev];
                  next[idx] = formatted;
                  return next;
                } else {
                  return [...prev, formatted];
                }
              });
            } else {
              // Non-active statuses (delivered, cancelled) are removed from map
              setActiveOrders((prev) => prev.filter((o) => o.id !== order.id));
            }
          }
        }
      )
      .subscribe((status) => {
        setIsOrdersConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const courierList = useMemo(() => Array.from(couriers.values()), [couriers]);
  const activeZones = useMemo(() => (zones ?? []).filter((z) => z.is_active), [zones]);

  const flyToCoords = (lat: number, lng: number) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: 15,
        speed: 1.2,
        curve: 1.4,
        essential: true,
      });
    }
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0a0a0a] text-[#ef4444]">
        Mapbox Token Eksik! Lütfen NEXT_PUBLIC_MAPBOX_TOKEN tanımlayın.
      </div>
    );
  }

  // Calculate default viewport center
  const initialCenter = restaurant 
    ? { longitude: restaurant.lng, latitude: restaurant.lat, zoom: 13 }
    : { longitude: 28.9795, latitude: 41.0151, zoom: 13 };

  return (
    <div className="relative flex h-full w-full bg-[#0a0a0a] overflow-hidden rounded-2xl border border-white/5">
      
      {/* ─── Sol Panel: Kuryeler ────────────────────────── */}
      <div className="w-72 shrink-0 border-r border-[#2a2a2a] bg-[#141414]/90 flex flex-col z-10">
        <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Canlı Kuryeler</h3>
            <p className="text-xs text-[#71717a] mt-0.5">{courierList.length} aktif kurye</p>
          </div>
          <button 
            onClick={() => setShowCouriers(!showCouriers)}
            className={`p-1.5 rounded-lg border transition-colors ${showCouriers ? 'border-[#f97316]/30 bg-[#f97316]/10 text-[#f97316]' : 'border-white/5 bg-white/5 text-zinc-500'}`}
            title={showCouriers ? 'Haritada Gizle' : 'Haritada Göster'}
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto divide-y divide-[#2a2a2a]">
          {courierList.length === 0 ? (
            <p className="p-4 text-xs text-[#52525b] text-center">Aktif veya çevrimiçi kurye yok.</p>
          ) : (
            courierList.map((c) => (
              <div 
                key={c.id} 
                className="p-3 hover:bg-[#1e1e1e] transition-colors flex items-center gap-3 cursor-pointer group"
                onClick={() => {
                  setSelectedCourier(c);
                  setSelectedOrder(null);
                  setSelectedRestaurant(false);
                  flyToCoords(c.lat, c.lng);
                }}
              >
                <div className="w-8 h-8 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center text-[#f97316] shrink-0">
                  <Bike className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-white truncate">{c.name}</h4>
                  <p className="text-[10px] text-[#71717a] mt-0.5 truncate">
                    {c.isActive ? 'Görevde' : 'Müsait'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${c.isActive ? 'bg-purple-500 animate-pulse' : 'bg-green-500'}`} />
                  <Navigation className="h-3 w-3 text-zinc-600 group-hover:text-[#f97316] transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── Harita Alanı ─────────────────────────────── */}
      <div className="flex-1 h-full relative">
        <Map
          ref={(ref) => { mapRef.current = ref; }}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={initialCenter}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          onClick={() => {
            setSelectedCourier(null);
            setSelectedOrder(null);
            setSelectedRestaurant(false);
          }}
        >
          <NavigationControl position="top-right" />

          {/* Bölgeler (Overlay) */}
          {showZones && activeZones.map((zone) => {
            const fillStyle: FillLayer = {
              id: `zone-fill-${zone.id}`,
              type: 'fill',
              paint: { 'fill-color': zone.color, 'fill-opacity': 0.08 },
            };
            const lineStyle: LineLayer = {
              id: `zone-line-${zone.id}`,
              type: 'line',
              paint: { 'line-color': zone.color, 'line-width': 1.2, 'line-opacity': 0.4 },
            };
            return (
              <Source key={zone.id} id={`zone-${zone.id}`} type="geojson" data={zone.polygon}>
                <Layer {...fillStyle} />
                <Layer {...lineStyle} />
              </Source>
            );
          })}

          {/* Restaurant Merkez Marker */}
          {restaurant && (
            <Marker longitude={restaurant.lng} latitude={restaurant.lat} anchor="center">
              <div 
                className="cursor-pointer p-2.5 bg-orange-600 rounded-full border border-white/20 shadow-[0_0_20px_rgba(249,115,22,0.6)] animate-pulse"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRestaurant(true);
                  setSelectedCourier(null);
                  setSelectedOrder(null);
                  flyToCoords(restaurant.lat, restaurant.lng);
                }}
              >
                <Store className="h-5 w-5 text-white" />
              </div>
            </Marker>
          )}

          {/* Kurye Markerları */}
          {showCouriers && courierList.map((c) => (
            <Marker key={c.id} longitude={c.lng} latitude={c.lat} anchor="bottom">
              <div 
                className="cursor-pointer flex flex-col items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCourier(c);
                  setSelectedOrder(null);
                  setSelectedRestaurant(false);
                  flyToCoords(c.lat, c.lng);
                }}
              >
                {/* İsim Plakası */}
                <div className="bg-black/85 border border-[#2a2a2a] text-white text-[9px] px-1.5 py-0.5 rounded shadow-md truncate max-w-[80px] mb-1 font-medium">
                  {c.name.split(' ')[0]}
                </div>
                {/* Pin */}
                <div className={`p-2 rounded-full border flex items-center justify-center shadow-lg transition-transform hover:scale-110 ${c.isActive ? 'bg-purple-600 border-purple-400' : 'bg-green-600 border-green-400'}`}>
                  <Bike className="h-4 w-4 text-white" />
                </div>
              </div>
            </Marker>
          ))}

          {/* Müşteri / Aktif Sipariş Markerları */}
          {showCustomers && activeOrders.map((o) => {
            if (!o.customer_lat || !o.customer_lng) return null;
            return (
              <Marker key={o.id} longitude={o.customer_lng} latitude={o.customer_lat} anchor="bottom">
                <div 
                  className="cursor-pointer flex flex-col items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedOrder(o);
                    setSelectedCourier(null);
                    setSelectedRestaurant(false);
                    flyToCoords(o.customer_lat, o.customer_lng);
                  }}
                >
                  {/* Pin */}
                  <div 
                    className="p-1.5 rounded-full border bg-zinc-900 shadow-md transition-transform hover:scale-110"
                    style={{ borderColor: PLATFORM_COLORS[o.platform] || '#f97316' }}
                  >
                    <MapPin className="h-4 w-4" style={{ color: PLATFORM_COLORS[o.platform] || '#f97316' }} />
                  </div>
                </div>
              </Marker>
            );
          })}

          {/* Popups */}
          {selectedRestaurant && restaurant && (
            <Popup
              longitude={restaurant.lng}
              latitude={restaurant.lat}
              anchor="bottom"
              offset={24}
              closeButton={false}
              onClose={() => setSelectedRestaurant(false)}
            >
              <div className="bg-[#141414] border border-[#2a2a2a] p-3 rounded-lg min-w-[180px] shadow-xl text-left">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5 text-[#f97316]" /> {restaurant.name}
                </h4>
                <p className="text-[10px] text-[#a1a1aa] mt-1.5 leading-relaxed">{restaurant.address}</p>
                <div className="border-t border-[#2a2a2a] mt-2 pt-2 flex items-center justify-between text-[9px] text-[#52525b] font-mono">
                  <span>{restaurant.lat.toFixed(5)}</span>
                  <span>{restaurant.lng.toFixed(5)}</span>
                </div>
              </div>
            </Popup>
          )}

          {selectedCourier && (
            <Popup
              longitude={selectedCourier.lng}
              latitude={selectedCourier.lat}
              anchor="bottom"
              offset={44}
              closeButton={false}
              onClose={() => setSelectedCourier(null)}
            >
              <div className="bg-[#141414] border border-[#2a2a2a] p-3 rounded-lg min-w-[180px] shadow-xl text-left">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Bike className="h-3.5 w-3.5 text-[#f97316]" /> {selectedCourier.name}
                </h4>
                <p className="text-[10px] text-[#a1a1aa] mt-1.5">
                  Durum: <span className={selectedCourier.isActive ? 'text-purple-400 font-medium' : 'text-green-400 font-medium'}>{selectedCourier.isActive ? 'Görevde' : 'Müsait'}</span>
                </p>
                <p className="text-[9px] text-[#52525b] mt-1 font-mono">
                  Konum: {selectedCourier.lat.toFixed(5)}, {selectedCourier.lng.toFixed(5)}
                </p>
              </div>
            </Popup>
          )}

          {selectedOrder && (
            <Popup
              longitude={selectedOrder.customer_lng}
              latitude={selectedOrder.customer_lat}
              anchor="bottom"
              offset={32}
              closeButton={false}
              onClose={() => setSelectedOrder(null)}
            >
              <div className="bg-[#141414] border border-[#2a2a2a] p-3 rounded-lg min-w-[200px] shadow-xl text-left">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="text-xs font-bold text-white truncate max-w-[120px]">{selectedOrder.customer_name}</h4>
                  <span 
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded capitalize"
                    style={{ backgroundColor: `${PLATFORM_COLORS[selectedOrder.platform]}20`, color: PLATFORM_COLORS[selectedOrder.platform] }}
                  >
                    {selectedOrder.platform}
                  </span>
                </div>
                <p className="text-[10px] text-[#a1a1aa] mt-1.5 truncate">{selectedOrder.customer_address}</p>
                <div className="border-t border-[#2a2a2a] mt-2 pt-2 flex justify-between items-center text-[10px]">
                  <span className="text-[#52525b]">Durum: {STATUS_LABELS[selectedOrder.status] || selectedOrder.status}</span>
                  <span className="font-bold text-white">₺{selectedOrder.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </Popup>
          )}
        </Map>

        {/* ─── Üst Kontrol Rozetleri ─────────────────────── */}
        <div className="absolute left-4 top-4 z-10 flex gap-2">
          {/* Bağlantı Badge */}
          <div className="flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#141414]/90 backdrop-blur-sm px-3.5 py-1.5 shadow-lg">
            <span className={`h-1.5 w-1.5 rounded-full ${isCourierConnected && isOrdersConnected ? 'bg-[#22c55e] animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[11px] font-bold text-white tracking-wider">
              {isCourierConnected && isOrdersConnected ? 'BAĞLI' : 'BAĞLANILIYOR...'}
            </span>
          </div>

          {/* Filtre Toggles */}
          <div className="flex items-center gap-1 rounded-full border border-[#2a2a2a] bg-[#141414]/90 backdrop-blur-sm p-1 shadow-lg">
            <button 
              onClick={() => setShowZones(!showZones)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${showZones ? 'bg-[#f97316] text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              BÖLGELER
            </button>
          </div>
        </div>
      </div>

      {/* ─── Sağ Panel: Aktif Siparişler ────────────────── */}
      <div className="w-80 shrink-0 border-l border-[#2a2a2a] bg-[#141414]/90 flex flex-col z-10">
        <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Aktif Siparişler</h3>
            <p className="text-xs text-[#71717a] mt-0.5">{activeOrders.length} teslimat sürecinde</p>
          </div>
          <button 
            onClick={() => setShowCustomers(!showCustomers)}
            className={`p-1.5 rounded-lg border transition-colors ${showCustomers ? 'border-[#f97316]/30 bg-[#f97316]/10 text-[#f97316]' : 'border-white/5 bg-white/5 text-zinc-500'}`}
            title={showCustomers ? 'Haritada Gizle' : 'Haritada Göster'}
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#2a2a2a]">
          {activeOrders.length === 0 ? (
            <p className="p-4 text-xs text-[#52525b] text-center">Aktif sipariş bulunmuyor.</p>
          ) : (
            activeOrders.map((o) => (
              <div 
                key={o.id}
                className="p-3.5 hover:bg-[#1e1e1e] transition-colors cursor-pointer group"
                onClick={() => {
                  setSelectedOrder(o);
                  setSelectedCourier(null);
                  setSelectedRestaurant(false);
                  flyToCoords(o.customer_lat, o.customer_lng);
                }}
              >
                <div className="flex justify-between items-start gap-2">
                  <h4 className="text-xs font-bold text-white truncate max-w-[150px]">{o.customer_name}</h4>
                  <span 
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded capitalize"
                    style={{ backgroundColor: `${PLATFORM_COLORS[o.platform]}20`, color: PLATFORM_COLORS[o.platform] }}
                  >
                    {o.platform}
                  </span>
                </div>
                <p className="text-[10px] text-[#71717a] mt-1.5 truncate">{o.customer_address}</p>
                
                <div className="flex items-center justify-between mt-3 text-[10px]">
                  <span className="text-[#f97316] font-semibold bg-[#f97316]/5 border border-[#f97316]/10 px-2 py-0.5 rounded">
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                  <div className="flex items-center gap-1.5 text-white font-semibold">
                    <span>₺{o.total_amount.toFixed(2)}</span>
                    <Navigation className="h-3 w-3 text-zinc-600 group-hover:text-[#f97316] transition-colors" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
