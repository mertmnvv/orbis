'use client';

/**
 * useCourierRealtime
 *
 * Supabase Realtime üzerinden tüm aktif kuryelerin konumlarını dinler.
 * couriers tablosuna UPDATE geldiğinde state'i günceller; web paneli
 * harita üzerindeki işaretçileri sayfa yenilemeden hareket ettirir.
 *
 * Mock modu: NEXT_PUBLIC_SUPABASE_URL tanımlı değilse 5 sn'de bir
 *            rastgele küçük konum delta'sı simüle eder.
 */

import { useEffect, useRef, useState } from 'react';
import { mockCouriers } from '@/lib/mock-data';
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

const IS_MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export function useCourierRealtime(): UseCourierRealtimeReturn {
  const [couriers, setCouriers] = useState<Map<string, CourierPosition>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (IS_MOCK) {
      return setupMock(setCouriers, setIsConnected);
    }
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

// ─── Mock (Development) ──────────────────────────────────────────────────────

function setupMock(
  setCouriers: React.Dispatch<React.SetStateAction<Map<string, CourierPosition>>>,
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>,
): () => void {
  // Başlangıç konumları
  const initialMap = buildMap(
    mockCouriers.filter((c) => c.current_lat !== null) as Courier[],
  );
  setCouriers(initialMap);

  // Bağlantı simülasyonu
  const connectTimer = setTimeout(() => setIsConnected(true), 800);

  // 5 sn'de bir küçük delta uygula (animasyon testi için)
  const interval = setInterval(() => {
    setCouriers((prev) => {
      const next = new Map(prev);
      next.forEach((pos, id) => {
        const deltaLat = (Math.random() - 0.5) * 0.001;
        const deltaLng = (Math.random() - 0.5) * 0.001;
        next.set(id, {
          ...pos,
          prevLat: pos.lat,
          prevLng: pos.lng,
          lat: pos.lat + deltaLat,
          lng: pos.lng + deltaLng,
          lastSeenAt: new Date().toISOString(),
        });
      });
      return next;
    });
  }, 5_000);

  return () => {
    clearTimeout(connectTimer);
    clearInterval(interval);
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
