import { z } from "zod";

export const createBookingSchema = z.object({
  slotId: z.string().cuid(),
  adults: z.number().int().positive(),
  kids: z.number().int().nonnegative().default(0),
});

// PATCH /api/bookings/:id/status — CONFIRMED is reached only via payment,
// so it is not an allowed manual target here.
export const updateBookingStatusSchema = z.object({
  status: z.enum(["COMPLETED", "CANCELLED"]),
});

export const operatorBookingsQuerySchema = z.object({
  status: z
    .enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"])
    .optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type OperatorBookingsQuery = z.infer<typeof operatorBookingsQuerySchema>;
