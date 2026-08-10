import { z } from "zod";

export const createOptionSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  currency: z.string().length(3).default("INR"),
  capacity: z.number().int().positive(),
  durationMinutes: z.number().int().positive(),
});

export const updateOptionSchema = z
  .object({
    name: z.string().min(1).optional(),
    price: z.number().nonnegative().optional(),
    currency: z.string().length(3).optional(),
    capacity: z.number().int().positive().optional(),
    durationMinutes: z.number().int().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const createSlotSchema = z
  .object({
    type: z.enum(["ONE_OFF", "RECURRING"]).default("ONE_OFF"),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    totalCapacity: z.number().int().positive(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });

export const listSlotsQuerySchema = z.object({
  // Optional YYYY-MM-DD filter for a single day's slots.
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .optional(),
});

export type CreateOptionInput = z.infer<typeof createOptionSchema>;
export type UpdateOptionInput = z.infer<typeof updateOptionSchema>;
export type CreateSlotInput = z.infer<typeof createSlotSchema>;
export type ListSlotsQuery = z.infer<typeof listSlotsQuerySchema>;
