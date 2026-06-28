export type OrderStatus =
  | "preparing"
  | "pending"
  | "assigned"
  | "picked_up"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "cash" | "card" | "online_paid";
export type PaymentStatus = "not_required" | "pending" | "collected" | "failed";

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
  restaurantAvgPrepTime?: number;
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
  preparationTimeMinutes?: number;
  estimatedReadyAt?: string;
  notes?: string;
  pickedUpLat?: number;
  pickedUpLng?: number;
  restaurantMaxMultiOrderKm?: number;
  restaurantMaxMultiOrderCount?: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentCollectedAt?: string | null;
  paymentNotes?: string | null;
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
