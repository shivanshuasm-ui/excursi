import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { slugify } from "../utils/slug.js";
import type {
  CreateExperienceInput,
  UpdateExperienceInput,
} from "../validators/experience.schema.js";

/** Generate a slug from the title that is unique across experiences. */
async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "experience";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const clash = await prisma.experience.findUnique({
      where: { slug: candidate },
    });
    if (!clash) return candidate;
  }
  // Extremely unlikely fallback.
  return `${base}-${Date.now()}`;
}

/** Load an experience and assert the given operator owns it. */
async function getOwnedExperience(id: string, operatorId: string) {
  const experience = await prisma.experience.findUnique({ where: { id } });
  if (!experience) {
    throw ApiError.notFound("Experience not found");
  }
  if (experience.operatorId !== operatorId) {
    throw ApiError.forbidden("You do not own this experience");
  }
  return experience;
}

export async function createExperience(
  operatorId: string,
  input: CreateExperienceInput,
) {
  return prisma.experience.create({
    data: {
      operatorId,
      title: input.title,
      slug: await uniqueSlug(input.title),
      description: input.description,
      destination: input.destination,
      categoryId: input.categoryId,
      itinerary: input.itinerary as Prisma.InputJsonValue | undefined,
      inclusions: input.inclusions as Prisma.InputJsonValue | undefined,
      gallery: input.gallery as Prisma.InputJsonValue | undefined,
      status: "DRAFT",
    },
  });
}

/** List the experiences belonging to one operator (dashboard view). */
export async function listOperatorExperiences(operatorId: string) {
  return prisma.experience.findMany({
    where: { operatorId },
    orderBy: { createdAt: "desc" },
    include: { options: true },
  });
}

export async function getOperatorExperience(id: string, operatorId: string) {
  await getOwnedExperience(id, operatorId);
  return prisma.experience.findUnique({
    where: { id },
    include: { options: { include: { slots: true } } },
  });
}

export async function updateExperience(
  id: string,
  operatorId: string,
  input: UpdateExperienceInput,
) {
  await getOwnedExperience(id, operatorId);
  return prisma.experience.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      destination: input.destination,
      categoryId: input.categoryId,
      itinerary: input.itinerary as Prisma.InputJsonValue | undefined,
      inclusions: input.inclusions as Prisma.InputJsonValue | undefined,
      gallery: input.gallery as Prisma.InputJsonValue | undefined,
      status: input.status,
    },
  });
}

export async function deleteExperience(id: string, operatorId: string) {
  await getOwnedExperience(id, operatorId);
  await prisma.experience.delete({ where: { id } });
}
