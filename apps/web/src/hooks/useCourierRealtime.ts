'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Courier } from '@/lib/types';

export interface CourierPosition {
  id: string;
  name: string;
  lat: number;
  lng: number;
  isActive: boolean;
  lastSeenAt: string | null;
  /** Animasyon için: önceki konumu sakla */
  prevLat?: number;
  prevLng?: number;
}

interface UseCourierRealtimeReturn {
  couriers: Map<string, CourierPosition>;
  isConnected: boolean;
}

export function useCourierRealtime(): UseCourierRealtimeReturn {
  const [couriers, setCouriers] = useState<Map<string, CourierPosition>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    return setupRealtime(setCouriers, setIsConnected);
  }, []);

  return { couriers, isConnected };
}

// ─── Realtime (Production) ────────────────────────────────────────────────────

function setupRealtime(
  setCouriers: React.Dispatch<React.SetStateAction<Map<string, CourierPosition>>>,
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>,
): () => void {
  // İlk yükleme: aktif kuryeleri çek
  supabase
    .from('couriers')
    .select('id, name, is_active, current_lat, current_lng, last_seen_at')
    .eq('is_active', true)
    .not('current_lat', 'is', null)
    .then(({ data }) => {
      if (!data) return;
      setCouriers(buildMap(data as Courier[]));
    });

  // couriers tablosundaki UPDATE eventlerini dinle
  const channel = supabase
    .channel('courier-positions', {
      config: { presence: { key: 'web-dashboard' } },
    })
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'couriers' },
      (payload) => {
        const c = payload.new as Courier;
        if (!c.current_lat || !c.current_lng) return;

        setCouriers((prev) => {
          const next = new Map(prev);
          const existing = next.get(c.id);
          next.set(c.id, {
            id: c.id,
            name: c.name,
            lat: c.current_lat!,
            lng: c.current_lng!,
            isActive: c.is_active,
            lastSeenAt: c.last_seen_at,
            // Animasyon için önceki konumu sakla
            prevLat: existing?.lat,
            prevLng: existing?.lng,
          });
          return next;
        });
      },
    )
    .subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── Yardımcı ────────────────────────────────────────────────────────────────

function buildMap(couriers: Courier[]): Map<string, CourierPosition> {
  const map = new Map<string, CourierPosition>();
  for (const c of couriers) {
    if (c.current_lat != null && c.current_lng != null) {
      map.set(c.id, {
        id: c.id,
        name: c.name,
        lat: c.current_lat,
        lng: c.current_lng,
        isActive: c.is_active,
        lastSeenAt: c.last_seen_at,
      });
    }
  }
  return map;
}
