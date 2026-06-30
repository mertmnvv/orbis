'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface DeliveryZone {
  id: string;
  name: string;
  polygon: GeoJSON.Feature<GeoJSON.Polygon>;
  color: string;
  is_active: boolean;
  created_at: string;
}

const ZONE_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#f43f5e', '#06b6d4'];

export { ZONE_COLORS };

async function fetchZones(): Promise<DeliveryZone[]> {
  const { data, error } = await supabase
    .from('delivery_zones')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DeliveryZone[];
}

export function useZones() {
  return useQuery({
    queryKey: ['delivery_zones'],
    queryFn: fetchZones,
    staleTime: 60_000,
  });
}

export function useCreateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; polygon: GeoJSON.Feature<GeoJSON.Polygon>; color: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum açık değil.');

      const { data: restaurant, error: resErr } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (resErr || !restaurant) throw new Error('Restoran kaydı bulunamadı.');

      const { data, error } = await supabase
        .from('delivery_zones')
        .insert({ name: payload.name, polygon: payload.polygon, color: payload.color, is_active: true, restaurant_id: restaurant.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery_zones'] }),
  });
}

export function useUpdateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<DeliveryZone> & { id: string }) => {
      const { id, ...rest } = payload;
      const { error } = await supabase.from('delivery_zones').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery_zones'] }),
  });
}

export function useDeleteZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery_zones'] }),
  });
}
