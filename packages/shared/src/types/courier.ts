import type { BaseEntity, GeoPoint, ISODateString } from "./common";

export type CourierStatus =
  | "offline"
  | "available"
  | "on_delivery"
  | "on_break";

export type VehicleType = "motorcycle" | "bicycle" | "car" | "walking";

export interface Courier extends BaseEntity {
  /** Linked Supabase auth user id. */
  userId: string;
  fullName: string;
  phone: string;
  vehicleType: VehicleType;
  status: CourierStatus;
  /** Last reported GPS position. */
  lastLocation?: GeoPoint;
  /** Timestamp of the last location ping. */
  lastSeenAt?: ISODateString;
  /** FCM device token for push notifications. */
  fcmToken?: string;
}
