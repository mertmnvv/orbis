import { z } from "zod";

export const RestaurantRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  phone: z.string().min(7).max(20).nullable().optional(),
  avg_prep_time_minutes: z.number().int().positive().nullable().optional(),
  created_at: z.string().datetime(),
});

export const DeliveryZoneSchema = z.object({
  id: z.string().uuid(),
  restaurant_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  polygon: z.object({
    type: z.literal("Feature"),
    geometry: z.object({
      type: z.literal("Polygon"),
      coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
    }),
    properties: z.record(z.unknown()).optional(),
  }),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
});

export const CreateOrderSchema = z.object({
  restaurant_id: z.string().uuid(),
  platform: z.enum(["yemeksepeti", "getir", "trendyol", "pakettaksi", "manual"]),
  customer_name: z.string().min(1).max(200).trim(),
  customer_address: z.string().min(1).max(500).trim(),
  customer_lat: z.number().min(-90).max(90).nullable().optional(),
  customer_lng: z.number().min(-180).max(180).nullable().optional(),
  customer_phone: z.string().min(7).max(20).nullable().optional(),
  items: z.array(z.object({
    name: z.string().min(1).max(200),
    quantity: z.number().int().positive().max(99),
    price: z.number().nonnegative(),
  })).min(1),
  total_amount: z.number().nonnegative(),
  notes: z.string().max(1000).nullable().optional(),
  payment_method: z.enum(["cash", "card", "online_paid", "food_card", "split"]),
  preparation_time_minutes: z.number().int().positive().max(120).nullable().optional(),
});

export type RestaurantRow = z.infer<typeof RestaurantRowSchema>;
export type DeliveryZone = z.infer<typeof DeliveryZoneSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
