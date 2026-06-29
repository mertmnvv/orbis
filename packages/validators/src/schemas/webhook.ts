import { z } from "zod";
import { PaymentMethodSchema, PlatformSchema, OrderItemSchema } from "./order";

// ----------------------------------------------------------------
// WebhookOrderSchema — normalised payload from external sources
// (Yemeksepeti, Getir, Trendyol, etc.)
//
// External platforms POST this to /api/webhooks/order-source.
// The endpoint maps it to an internal orders row.
// ----------------------------------------------------------------
export const WebhookCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(7).max(30).optional(),
  address: z.string().min(1).max(500),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const WebhookOrderSchema = z.object({
  /** Source platform identifier */
  source: PlatformSchema.default("manual"),
  /** Order ID on the external platform (stored in platform_order_id) */
  external_id: z.string().max(100).optional(),
  customer: WebhookCustomerSchema,
  items: z.array(OrderItemSchema).min(1),
  total: z.number().nonnegative(),
  payment_method: PaymentMethodSchema.default("online_paid"),
  notes: z.string().max(1000).optional(),
  preparation_time_minutes: z.number().int().positive().max(180).optional(),
});

export type WebhookOrder = z.infer<typeof WebhookOrderSchema>;

// ----------------------------------------------------------------
// Utility: map a validated WebhookOrder to an orders INSERT payload.
// restaurant_id must be provided by the calling server code.
// ----------------------------------------------------------------
export function mapWebhookToOrder(
  data: WebhookOrder,
  restaurantId: string,
): {
  restaurant_id: string;
  platform: WebhookOrder["source"];
  platform_order_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string;
  customer_lat: number | null;
  customer_lng: number | null;
  items: WebhookOrder["items"];
  total_amount: number;
  notes: string | null;
  payment_method: WebhookOrder["payment_method"];
  payment_status: "not_required" | "pending";
  status: "preparing";
  order_source: string;
  preparation_time_minutes: number | null;
} {
  return {
    restaurant_id: restaurantId,
    platform: data.source,
    platform_order_id: data.external_id ?? null,
    customer_name: data.customer.name,
    customer_phone: data.customer.phone ?? null,
    customer_address: data.customer.address,
    customer_lat: data.customer.lat ?? null,
    customer_lng: data.customer.lng ?? null,
    items: data.items,
    total_amount: data.total,
    notes: data.notes ?? null,
    payment_method: data.payment_method,
    payment_status: data.payment_method === "online_paid" ? "not_required" : "pending",
    status: "preparing",
    order_source: data.source,
    preparation_time_minutes: data.preparation_time_minutes ?? null,
  };
}
