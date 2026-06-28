export type OrderStatus =
  | "pending"
  | "assigned"
  | "picked_up"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLat: number;
  restaurantLng: number;
  customerName: string;
  customerAddress: string;
  customerLat: number;
  customerLng: number;
  customerPhone: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  estimatedDistance: string;
  estimatedTime: string;
  pickedUpLat?: number;
  pickedUpLng?: number;
}

export interface CourierLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface DeliveryZone {
  id: string;
  name: string;
  polygon: any;
  color: string;
  is_active: boolean;
}
