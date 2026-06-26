export type Platform = 'yemeksepeti' | 'getir' | 'trendyol' | 'pakettaksi' | 'manual';
export type OrderStatus = 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled';
export type VehicleType = 'bicycle' | 'motorcycle' | 'car' | 'scooter' | 'on_foot';

export interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  created_at: string;
}

export interface Courier {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  vehicle_type: VehicleType;
  is_active: boolean;
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
  status: OrderStatus;
  total_amount: number;
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
