/** Shared primitive types used across Orbis entities. */

export type UUID = string;

/** ISO-8601 timestamp string (e.g. "2026-06-26T12:00:00.000Z"). */
export type ISODateString = string;

/** A geographic point. */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/** A physical address. */
export interface Address {
  line1: string;
  line2?: string;
  district?: string;
  city: string;
  postalCode?: string;
  country: string;
  location?: GeoPoint;
}

/** Fields shared by every persisted entity. */
export interface BaseEntity {
  id: UUID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Money expressed in minor units (e.g. kuruş) plus a currency code. */
export interface Money {
  /** Amount in the smallest currency unit. */
  amountMinor: number;
  /** ISO-4217 currency code, e.g. "TRY". */
  currency: string;
}
