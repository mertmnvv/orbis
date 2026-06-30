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

interface OrdersFilter {
  startDate?: string; // ISO string
  endDate?: string;   // ISO string
}

async function fetchOrders(filter?: OrdersFilter): Promise<OrderWithCourier[]> {
  let query = supabase
    .from('orders')
    .select(`
      *,
      courier:couriers (
        id, user_id, restaurant_id, name, phone, vehicle_type,
        is_active, is_available, current_lat, current_lng, last_seen_at, created_at
      )
    `)
    .order('created_at', { ascending: false });

  if (filter?.startDate) {
    query = query.gte('created_at', filter.startDate);
  }
  if (filter?.endDate) {
    query = query.lte('created_at', filter.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  const parsed = z.array(OrderWithCourierSchema).safeParse(data);
  if (!parsed.success) {
    console.warn('[useOrders] Validation warnings:', parsed.error.flatten());
  }
  return (parsed.success ? parsed.data : data) as OrderWithCourier[];
}

export function useOrders(filter?: OrdersFilter) {
  return useQuery<OrderWithCourier[]>({
    queryKey: ['orders', filter?.startDate ?? null, filter?.endDate ?? null],
    queryFn: () => fetchOrders(filter),
    staleTime: 30_000,
  });
}

async function triggerAutoDispatch(orderId: string): Promise<void> {
  try {
    await fetch('/api/orders/auto-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    });
  } catch {
    // Fire-and-forget — hata sessizce görmezden gelinir
  }
}

async function isAutoDispatchEnabled(): Promise<boolean> {
  const { data } = await supabase
    .from('restaurants')
    .select('auto_dispatch_enabled')
    .limit(1)
    .maybeSingle();
  return data?.auto_dispatch_enabled ?? false;
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
          queryClient.invalidateQueries({ queryKey: ['orders'], exact: false });
          if (payload.eventType === 'INSERT') {
            const row = payload.new as Record<string, unknown>;
            const platform = String(row.platform ?? '');
            playAlert();
            toast.success('Yeni sipariş!', { description: `Platform: ${platform}` });
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as Record<string, unknown>;
            const name = String(row.customer_name ?? '');
            const status = String(row.status ?? '') as OrderStatus;
            // "pending" durumuna geçişte auto-dispatch dene
            if (status === 'pending' && !row.courier_id) {
              isAutoDispatchEnabled().then((enabled) => {
                if (enabled) triggerAutoDispatch(String(row.id));
              });
            }
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
