import type {
  Address,
  BaseEntity,
  GeoPoint,
  ISODateString,
  Money,
  UUID,
} from "./common";
import type { PlatformId } from "./platform";

export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "assigned"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: Money;
  notes?: string;
}

export interface CustomerInfo {
  name: string;
  phone?: string;
  address: Address;
  location?: GeoPoint;
}

export interface Order extends BaseEntity {
  /** Order reference shown to staff/customers. */
  reference: string;
  restaurantId: UUID;
  /** Assigned courier, if any. */
  courierId?: UUID;
  /** Source platform the order came from. */
  platform: PlatformId;
  status: OrderStatus;
  customer: CustomerInfo;
  items: OrderItem[];
  total: Money;
  /** Estimated delivery time. */
  estimatedDeliveryAt?: ISODateString;
  /** Actual delivery timestamp. */
  deliveredAt?: ISODateString;
  notes?: string;
}
