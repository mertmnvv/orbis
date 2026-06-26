/** Delivery / ordering platforms that feed orders into Orbis. */

export type PlatformId = "yemeksepeti" | "getir" | "trendyol";

export interface Platform {
  id: PlatformId;
  /** Human-readable name, e.g. "Yemeksepeti". */
  name: string;
  /** Brand color used in dashboards (hex). */
  color?: string;
  /** Whether this platform integration is currently enabled. */
  enabled: boolean;
}
