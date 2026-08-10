import { z } from "zod";

export const operatorSignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1),
  phone: z.string().min(6).optional(),
  businessName: z.string().min(1),
  description: z.string().optional(),
});

export const operatorUpdateSchema = z
  .object({
    businessName: z.string().min(1).optional(),
    description: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type OperatorSignupInput = z.infer<typeof operatorSignupSchema>;
export type OperatorUpdateInput = z.infer<typeof operatorUpdateSchema>;
