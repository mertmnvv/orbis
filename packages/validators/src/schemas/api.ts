import { z } from "zod";

export const DirectionsQuerySchema = z.object({
  originLng: z.coerce.number().min(-180).max(180),
  originLat: z.coerce.number().min(-90).max(90),
  destLng: z.coerce.number().min(-180).max(180),
  destLat: z.coerce.number().min(-90).max(90),
});

export const DirectionsResponseSchema = z.object({
  distance: z.string(),
  duration: z.string(),
});

export type DirectionsQuery = z.infer<typeof DirectionsQuerySchema>;
export type DirectionsResponse = z.infer<typeof DirectionsResponseSchema>;
