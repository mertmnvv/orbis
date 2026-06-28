'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { OrderStatus, OrderWithCourier } from '@/lib/types';

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
  return data as OrderWithCourier[];
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

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          if (payload.eventType === 'INSERT') {
            toast.success('Yeni sipariş!', {
              description: `Platform: ${(payload.new as any).platform}`,
            });
          } else if (payload.eventType === 'UPDATE') {
            const o = payload.new as any;
            toast.info('Sipariş güncellendi', {
              description: `${o.customer_name} → ${STATUS_LABELS[o.status as OrderStatus] ?? o.status}`,
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
