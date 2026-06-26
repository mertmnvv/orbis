'use client';

/**
 * useRouteHistory
 *
 * Belirli bir kurye için son 4 saatin rota geçmişini yükler
 * ve yeni INSERT eventlerini Realtime ile anlık olarak ekler.
 *
 * Mock modu: Rastgele güzergah noktaları simüle eder.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CourierLocation } from '@/lib/types';

export interface LatLng {
  lat: number;
  lng: number;
}

const IS_MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export function useRouteHistory(courierId: string | null | undefined): LatLng[] {
  const [route, setRoute] = useState<LatLng[]>([]);

  useEffect(() => {
    if (!courierId) {
      setRoute([]);
      return;
    }

    if (IS_MOCK) {
      return setupMockRoute(courierId, setRoute);
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

// ─── Mock (Development) ──────────────────────────────────────────────────────

function setupMockRoute(
  courierId: string,
  setRoute: React.Dispatch<React.SetStateAction<LatLng[]>>,
): () => void {
  // Beşiktaş çevresinde rastgele bir başlangıç noktası
  const seed = courierId.charCodeAt(0) / 255;
  const baseLat = 41.04 + seed * 0.02;
  const baseLng = 29.0 + seed * 0.02;

  // 20 geçmiş nokta oluştur
  const initialRoute: LatLng[] = Array.from({ length: 20 }, (_, i) => ({
    lat: baseLat + i * 0.0005 + (Math.random() - 0.5) * 0.0003,
    lng: baseLng + i * 0.0003 + (Math.random() - 0.5) * 0.0003,
  }));
  setRoute(initialRoute);

  // 10 sn'de bir yeni nokta ekle
  const interval = setInterval(() => {
    setRoute((prev) => {
      const last = prev[prev.length - 1] ?? { lat: baseLat, lng: baseLng };
      return [
        ...prev,
        {
          lat: last.lat + (Math.random() - 0.48) * 0.0008,
          lng: last.lng + (Math.random() - 0.48) * 0.0005,
        },
      ];
    });
  }, 10_000);

  return () => clearInterval(interval);
}
