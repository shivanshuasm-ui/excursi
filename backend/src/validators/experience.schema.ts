import { z } from "zod";

const itineraryStep = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export const createExperienceSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  destination: z.string().optional(),
  categoryId: z.string().cuid().optional(),
  itinerary: z.array(itineraryStep).optional(),
  inclusions: z.array(z.string()).optional(),
  gallery: z.array(z.string().url()).optional(),
});

// PUT is treated as a partial update; status transitions (publish/archive)
// go through the same endpoint.
export const updateExperienceSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    destination: z.string().optional(),
    categoryId: z.string().cuid().nullable().optional(),
    itinerary: z.array(itineraryStep).optional(),
    inclusions: z.array(z.string()).optional(),
    gallery: z.array(z.string().url()).optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type CreateExperienceInput = z.infer<typeof createExperienceSchema>;
export type UpdateExperienceInput = z.infer<typeof updateExperienceSchema>;
