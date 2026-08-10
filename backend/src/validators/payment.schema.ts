import { z } from "zod";

export const createOrderSchema = z.object({
  bookingId: z.string().cuid(),
});

export const verifyPaymentSchema = z.object({
  bookingId: z.string().cuid(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
