import type { OrderStatus } from "../types/order";
import type { Platform, PlatformId } from "../types/platform";

/** Canonical platform metadata. */
export const PLATFORMS: Record<PlatformId, Platform> = {
  yemeksepeti: {
    id: "yemeksepeti",
    name: "Yemeksepeti",
    color: "#FA0050",
    enabled: true,
  },
  getir: {
    id: "getir",
    name: "Getir",
    color: "#5D3EBC",
    enabled: true,
  },
  trendyol: {
    id: "trendyol",
    name: "Trendyol",
    color: "#F27A1A",
    enabled: true,
  },
};

/** Ordered list of order statuses representing the normal lifecycle. */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "assigned",
  "picked_up",
  "on_the_way",
  "delivered",
];

export const DEFAULT_CURRENCY = "TRY";
