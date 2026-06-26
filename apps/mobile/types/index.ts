export type OrderStatus =
  | "pending"
  | "accepted"
  | "picked_up"
  | "delivered"
  | "rejected";

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
}

export interface CourierLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}
