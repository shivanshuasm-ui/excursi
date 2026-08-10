import { z } from "zod";

/** Query params for the public GET /api/experiences listing. */
export const experienceQuerySchema = z.object({
  q: z.string().trim().min(1).optional(), // free-text over title/description
  destination: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(), // category slug
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export type ExperienceQuery = z.infer<typeof experienceQuerySchema>;
