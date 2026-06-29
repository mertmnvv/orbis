import { z } from "zod";

export const OrderStatusSchema = z.enum([
  "preparing",
  "pending",
  "assigned",
  "picked_up",
  "delivered",
  "cancelled",
]);

export const PaymentMethodSchema = z.enum([
  "cash",
  "card",
  "online_paid",
  "food_card",
  "split",
]);

export const PaymentStatusSchema = z.enum([
  "not_required",
  "pending",
  "collected",
  "failed",
]);

export const PlatformSchema = z.enum([
  "yemeksepeti",
  "getir",
  "trendyol",
  "pakettaksi",
  "manual",
]);

export const OrderItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().int().positive().max(99),
  price: z.number().nonnegative(),
});

export const SplitPaymentNotesSchema = z.object({
  split: z.object({
    cash: z.number().nonnegative().optional(),
    card: z.number().nonnegative().optional(),
    food_card: z.number().nonnegative().optional(),
  }),
});

export const PosSyncStatusSchema = z.enum([
  "not_applicable",
  "pending",
  "synced",
  "failed",
]);

export const OrderRowSchema = z.object({
  id: z.string().uuid(),
  restaurant_id: z.string().uuid(),
  courier_id: z.string().uuid().nullable(),
  platform: PlatformSchema,
  platform_order_id: z.string().nullable(),
  customer_name: z.string().min(1).max(200),
  customer_address: z.string().min(1).max(500),
  customer_lat: z.number().nullable(),
  customer_lng: z.number().nullable(),
  customer_phone: z.string().nullable().optional(),
  items: z.array(OrderItemSchema),
  status: OrderStatusSchema,
  total_amount: z.number().nonnegative(),
  notes: z.string().nullable().optional(),
  order_source: z.string().nullable().optional(),
  preparation_time_minutes: z.number().int().positive().nullable().optional(),
  estimated_ready_at: z.string().datetime().nullable().optional(),
  payment_method: PaymentMethodSchema,
  payment_status: PaymentStatusSchema,
  payment_collected_at: z.string().datetime().nullable().optional(),
  payment_notes: z.string().nullable().optional(),
  courier_status_note: z.string().max(500).nullable().optional(),
  customer_rating: z.number().int().min(1).max(5).nullable().optional(),
  customer_comment: z.string().nullable().optional(),
  pos_transaction_id: z.string().nullable().optional(),
  collected_amount: z.number().nonnegative().nullable().optional(),
  pos_sync_status: PosSyncStatusSchema.nullable().optional(),
  pos_synced_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime(),
  assigned_at: z.string().datetime().nullable(),
  picked_up_at: z.string().datetime().nullable(),
  delivered_at: z.string().datetime().nullable(),
});

export const CourierRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  restaurant_id: z.string().uuid().nullable(),
  name: z.string().min(1).max(100),
  phone: z.string().min(7).max(20),
  vehicle_type: z.enum(["bicycle", "motorcycle", "car", "scooter", "on_foot"]),
  is_active: z.boolean(),
  is_available: z.boolean(),
  current_lat: z.number().nullable(),
  current_lng: z.number().nullable(),
  last_seen_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});

export const OrderWithCourierSchema = OrderRowSchema.extend({
  courier: CourierRowSchema.nullable(),
});

export const parseSplitPaymentNotes = (raw: string | null | undefined): z.infer<typeof SplitPaymentNotesSchema> | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const result = SplitPaymentNotesSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};

export type OrderRow = z.infer<typeof OrderRowSchema>;
export type CourierRow = z.infer<typeof CourierRowSchema>;
export type OrderWithCourier = z.infer<typeof OrderWithCourierSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type PosSyncStatus = z.infer<typeof PosSyncStatusSchema>;
export type Platform = z.infer<typeof PlatformSchema>;
