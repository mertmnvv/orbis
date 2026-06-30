'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CourierLocation } from '@/lib/types';

export interface LatLng {
  lat: number;
  lng: number;
}

export function useRouteHistory(courierId: string | null | undefined): LatLng[] {
  const [route, setRoute] = useState<LatLng[]>([]);

  useEffect(() => {
    if (!courierId) {
      setRoute([]);
      return;
    }

    return setupRealtimeRoute(courierId, setRoute);
  }, [courierId]);

  return route;
}

// ─── Realtime (Production) ────────────────────────────────────────────────────

function setupRealtimeRoute(
  courierId: string,
  setRoute: React.Dispatch<React.SetStateAction<LatLng[]>>,
): () => void {
  const since = new Date(Date.now() - 4 * 3600 * 1000).toISOString();

  // İlk yükleme: son 4 saatin geçmişi (max 200 nokta)
  supabase
    .from('courier_locations')
    .select('lat, lng, recorded_at')
    .eq('courier_id', courierId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true })
    .limit(200)
    .then(({ data }) => {
      if (data) {
        setRoute(data.map((p: Pick<CourierLocation, 'lat' | 'lng'>) => ({ lat: p.lat, lng: p.lng })));
      }
    });

  // Yeni konum noktaları geldiğinde polyline'a ekle
  const channel = supabase
    .channel(`route-${courierId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'courier_locations',
        filter: `courier_id=eq.${courierId}`,
      },
      (payload) => {
        const loc = payload.new as CourierLocation;
        setRoute((prev) => [...prev, { lat: loc.lat, lng: loc.lng }]);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

