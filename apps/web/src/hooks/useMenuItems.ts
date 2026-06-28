import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { MenuItem } from '@/lib/types';
import { MOCK_MENU_ITEMS } from '@/lib/mock-data';

export function useMenuItems(restaurantId: string | null) {
  return useQuery<MenuItem[]>({
    queryKey: ['menu_items', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('category')
        .order('name');
      if (error) throw error;
      const items = data ?? [];
      if (items.length > 0) return items;
      return MOCK_MENU_ITEMS.map((i) => ({ ...i, restaurant_id: restaurantId }));
    },
    enabled: !!restaurantId,
    staleTime: 30_000,
  });
}

export function useCreateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Omit<MenuItem, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('menu_items').insert(item).select().single();
      if (error) throw error;
      return data as MenuItem;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['menu_items', data.restaurant_id] });
    },
  });
}

export function useUpdateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MenuItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('menu_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as MenuItem;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['menu_items', data.restaurant_id] });
    },
  });
}

export function useDeleteMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, restaurant_id }: { id: string; restaurant_id: string }) => {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw error;
      return { id, restaurant_id };
    },
    onSuccess: ({ restaurant_id }) => {
      qc.invalidateQueries({ queryKey: ['menu_items', restaurant_id] });
    },
  });
}
