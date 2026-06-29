'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { OrderWithCourierSchema } from '@orbis/validators';
import type { OrderStatus, OrderWithCourier } from '@/lib/types';
import { z } from 'zod';
import { useAudioAlert } from './useAudioAlert';

const STATUS_LABELS: Record<OrderStatus, string> = {
  preparing: 'Hazırlanıyor',
  pending: 'Bekliyor',
  assigned: 'Kurye Atandı',
  picked_up: 'Yolda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
};

async function fetchOrders(): Promise<OrderWithCourier[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      courier:couriers (
        id, user_id, restaurant_id, name, phone, vehicle_type,
        is_active, is_available, current_lat, current_lng, last_seen_at, created_at
      )
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const parsed = z.array(OrderWithCourierSchema).safeParse(data);
  if (!parsed.success) {
    console.warn('[useOrders] Validation warnings:', parsed.error.flatten());
  }
  return (parsed.success ? parsed.data : data) as OrderWithCourier[];
}

export function useOrders() {
  return useQuery<OrderWithCourier[]>({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    staleTime: 30_000,
  });
}

export function useRealtimeOrders() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const playAlert = useAudioAlert('/sounds/bell.mp3');

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          if (payload.eventType === 'INSERT') {
            const platform = String((payload.new as Record<string, unknown>).platform ?? '');
            playAlert();
            toast.success('Yeni sipariş!', { description: `Platform: ${platform}` });
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as Record<string, unknown>;
            const name = String(row.customer_name ?? '');
            const status = String(row.status ?? '') as OrderStatus;
            toast.info('Sipariş güncellendi', {
              description: `${name} → ${STATUS_LABELS[status] ?? status}`,
            });
          }
        },
      )
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { isConnected };
}
