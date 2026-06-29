import { z } from "zod";

export const VehicleTypeSchema = z.enum([
  "bicycle",
  "motorcycle",
  "car",
  "scooter",
  "on_foot",
]);

export const UpdateCourierStatusSchema = z.object({
  is_available: z.boolean(),
});

export const UpdateCourierLocationSchema = z.object({
  current_lat: z.number().min(-90).max(90),
  current_lng: z.number().min(-180).max(180),
  last_seen_at: z.string().datetime(),
});

export const AcceptOrderSchema = z.object({
  order_id: z.string().uuid(),
  courier_id: z.string().uuid(),
});

export const UpdateOrderStatusSchema = z.object({
  order_id: z.string().uuid(),
  status: z.enum(["picked_up", "delivered"]),
});

export const RecordPaymentSchema = z.object({
  order_id: z.string().uuid(),
  collected: z.boolean(),
  payment_method: z.enum(["cash", "card", "online_paid", "food_card", "split"]).optional(),
  notes: z.string().max(1000).optional(),
});

export const CourierStatusNoteSchema = z.object({
  order_id: z.string().uuid(),
  note: z.string().max(500).nullable(),
});
