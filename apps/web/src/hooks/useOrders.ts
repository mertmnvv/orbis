import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { mockOrders } from '@/lib/mock-data';
import type { OrderStatus, OrderWithCourier } from '@/lib/types';
// import { supabase } from '@/lib/supabase'; // Uncomment when Supabase is ready

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Bekliyor',
  assigned: 'Kurye Atandı',
  picked_up: 'Yolda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'assigned',
  assigned: 'picked_up',
  picked_up: 'delivered',
};

const TIMESTAMP_FIELD: Partial<Record<OrderStatus, string>> = {
  assigned: 'assigned_at',
  picked_up: 'picked_up_at',
  delivered: 'delivered_at',
};

async function fetchOrders(): Promise<OrderWithCourier[]> {
  // ── Supabase (uncomment when ready) ───────────────────────────────────
  // const { data, error } = await supabase
  //   .from('orders')
  //   .select(`
  //     *,
  //     courier:couriers (
  //       id, user_id, name, phone, vehicle_type,
  //       is_active, current_lat, current_lng, last_seen_at, created_at
  //     )
  //   `)
  //   .order('created_at', { ascending: false });
  // if (error) throw error;
  // return data as OrderWithCourier[];
  // ──────────────────────────────────────────────────────────────────────

  await new Promise((r) => setTimeout(r, 600));
  return mockOrders;
}

export function useOrders() {
  return useQuery<OrderWithCourier[]>({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    staleTime: Infinity,
    refetchInterval: false,
  });
}

export function useRealtimeOrders() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // ── Supabase Realtime (uncomment when ready) ───────────────────────
    // const channel = supabase
    //   .channel('dashboard-orders')
    //   .on(
    //     'postgres_changes',
    //     { event: '*', schema: 'public', table: 'orders' },
    //     (payload) => {
    //       queryClient.invalidateQueries({ queryKey: ['orders'] });
    //       if (payload.eventType === 'INSERT') {
    //         toast.success('Yeni sipariş!', {
    //           description: `Platform: ${(payload.new as any).platform}`,
    //         });
    //       } else if (payload.eventType === 'UPDATE') {
    //         const o = payload.new as any;
    //         toast.info('Sipariş güncellendi', {
    //           description: `${o.customer_name} → ${STATUS_LABELS[o.status as OrderStatus]}`,
    //         });
    //       }
    //     },
    //   )
    //   .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));
    //
    // return () => { supabase.removeChannel(channel); };
    // ──────────────────────────────────────────────────────────────────

    // Mock: simulate connection + advance a random active order every 20s
    const connectTimer = setTimeout(() => setIsConnected(true), 1200);

    const simulateUpdate = () => {
      queryClient.setQueryData<OrderWithCourier[]>(['orders'], (prev) => {
        if (!prev) return prev;
        const active = prev.filter((o) => NEXT_STATUS[o.status]);
        if (active.length === 0) return prev;
        const target = active[Math.floor(Math.random() * active.length)];
        const newStatus = NEXT_STATUS[target.status]!;
        const tsField = TIMESTAMP_FIELD[newStatus]!;

        toast.info('Sipariş güncellendi', {
          description: `${target.customer_name} → ${STATUS_LABELS[newStatus]}`,
        });

        return prev.map((o) =>
          o.id === target.id
            ? { ...o, status: newStatus, [tsField]: new Date().toISOString() }
            : o,
        );
      });
    };

    const updateTimer = setInterval(simulateUpdate, 20_000);

    return () => {
      clearTimeout(connectTimer);
      clearInterval(updateTimer);
    };
  }, [queryClient]);

  return { isConnected };
}
