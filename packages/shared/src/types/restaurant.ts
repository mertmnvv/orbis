import type { Address, BaseEntity, GeoPoint } from "./common";

export interface Restaurant extends BaseEntity {
  name: string;
  /** Owning organization / account id. */
  ownerId: string;
  address: Address;
  location: GeoPoint;
  phone?: string;
  /** Whether the restaurant is currently accepting orders. */
  isOpen: boolean;
  /** Average preparation time in minutes, used for ETA estimates. */
  avgPrepTimeMinutes?: number;
}
