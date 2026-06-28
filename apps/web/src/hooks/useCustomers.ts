import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Customer } from '@/lib/types';

export async function fetchCustomerByPhone(
  phone: string,
  restaurantId: string
): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('phone', phone)
    .maybeSingle();
  if (error) throw error;
  return data as Customer | null;
}

export async function fetchCustomersByName(
  name: string,
  restaurantId: string
): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .ilike('name', `%${name}%`)
    .limit(8);
  if (error) throw error;
  return (data ?? []) as Customer[];
}

export function useUpsertCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (customer: Omit<Customer, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('customers')
        .upsert(customer, { onConflict: 'restaurant_id,phone' })
        .select()
        .single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
