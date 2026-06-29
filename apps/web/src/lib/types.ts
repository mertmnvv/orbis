export type Platform = 'yemeksepeti' | 'getir' | 'trendyol' | 'pakettaksi' | 'manual';
export type OrderStatus = 'preparing' | 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled';
export type VehicleType = 'bicycle' | 'motorcycle' | 'car' | 'scooter' | 'on_foot';
export type PaymentMethod = 'cash' | 'card' | 'online_paid' | 'food_card' | 'split';
export type PaymentStatus = 'not_required' | 'pending' | 'collected' | 'failed';
export type PosSyncStatus = 'not_applicable' | 'pending' | 'synced' | 'failed';

export interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  avg_prep_time_minutes: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category: string;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  stock_count?: number | null;
  created_at: string;
}

export interface Customer {
  id: string;
  restaurant_id: string;
  name: string;
  phone: string;
  address: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface Courier {
  id: string;
  user_id: string | null;
  restaurant_id: string | null;
  name: string;
  phone: string;
  vehicle_type: VehicleType;
  is_active: boolean;
  is_available: boolean;
  current_lat: number | null;
  current_lng: number | null;
  last_seen_at: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  courier_id: string | null;
  platform: Platform;
  platform_order_id: string | null;
  customer_name: string;
  customer_address: string;
  customer_lat: number | null;
  customer_lng: number | null;
  customer_phone?: string | null;
  items?: { name: string; quantity: number; price: number }[];
  status: OrderStatus;
  total_amount: number;
  notes?: string | null;
  order_source?: string | null;
  preparation_time_minutes?: number | null;
  estimated_ready_at?: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_collected_at?: string | null;
  payment_notes?: string | null;
  courier_status_note?: string | null;
  customer_rating?: number | null;
  customer_comment?: string | null;
  pos_transaction_id?: string | null;
  collected_amount?: number | null;
  pos_sync_status?: PosSyncStatus | null;
  pos_synced_at?: string | null;
  created_at: string;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
}

export interface OrderWithCourier extends Order {
  courier: Courier | null;
}

export interface CourierLocation {
  id: string;
  courier_id: string;
  lat: number;
  lng: number;
  recorded_at: string;
}
