import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { slugify } from "../utils/slug.js";
import type {
  CreateExperienceInput,
  UpdateExperienceInput,
} from "../validators/experience.schema.js";
import type { ExperienceQuery } from "../validators/experience.query.js";

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

// ─── Public (traveler-facing) reads ─────────────────────────────────────────

/** Bounds an in-memory sort/paginate over matched experiences (MVP scale). */
const MAX_PUBLIC_MATCH = 500;

function dayRange(date: string): { gte: Date; lt: Date } {
  const gte = new Date(`${date}T00:00:00.000Z`);
  const lt = new Date(gte);
  lt.setUTCDate(lt.getUTCDate() + 1);
  return { gte, lt };
}

/** Build the Prisma filter for the public listing (PUBLISHED only). */
function buildPublicWhere(query: ExperienceQuery): Prisma.ExperienceWhereInput {
  const where: Prisma.ExperienceWhereInput = { status: "PUBLISHED" };

  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
    ];
  }
  if (query.destination) {
    where.destination = { contains: query.destination, mode: "insensitive" };
  }
  if (query.category) {
    where.category = { slug: query.category };
  }

  // Price range and date-availability both constrain the option relation.
  const optionWhere: Prisma.OptionWhereInput = {};
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    optionWhere.price = {
      ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
    };
  }
  if (query.date) {
    optionWhere.slots = {
      some: { startTime: dayRange(query.date), availableCapacity: { gt: 0 } },
    };
  }
  if (Object.keys(optionWhere).length > 0) {
    where.options = { some: optionWhere };
  }

  return where;
}

interface ExperienceCard {
  id: string;
  slug: string;
  title: string;
  destination: string | null;
  gallery: Prisma.JsonValue;
  category: { name: string; slug: string } | null;
  fromPrice: number | null;
  currency: string | null;
}

/**
 * Public experience listing with filters (destination, date, category, price),
 * free-text search, sorting, and pagination. Sorting by price and paging are
 * done in-memory since `fromPrice` is derived from the option relation.
 */
export async function listPublicExperiences(query: ExperienceQuery) {
  const matches = await prisma.experience.findMany({
    where: buildPublicWhere(query),
    take: MAX_PUBLIC_MATCH,
    orderBy: { createdAt: "desc" }, // default "newest"; price sorts re-order below
    include: {
      category: { select: { name: true, slug: true } },
      options: { select: { price: true, currency: true } },
    },
  });

  const cards: ExperienceCard[] = matches.map((exp) => {
    const cheapest = exp.options.reduce<{ price: number; currency: string } | null>(
      (min, opt) => {
        const price = Number(opt.price);
        if (!min || price < min.price) return { price, currency: opt.currency };
        return min;
      },
      null,
    );
    return {
      id: exp.id,
      slug: exp.slug,
      title: exp.title,
      destination: exp.destination,
      gallery: exp.gallery,
      category: exp.category,
      fromPrice: cheapest?.price ?? null,
      currency: cheapest?.currency ?? null,
    };
  });

  cards.sort((a, b) => {
    switch (query.sort) {
      case "price_asc":
        return (a.fromPrice ?? Infinity) - (b.fromPrice ?? Infinity);
      case "price_desc":
        return (b.fromPrice ?? -Infinity) - (a.fromPrice ?? -Infinity);
      default:
        return 0; // "newest" — preserves the createdAt-desc order from the query
    }
  });

  const total = cards.length;
  const start = (query.page - 1) * query.limit;
  const items = cards.slice(start, start + query.limit);

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

/** Public experience detail by slug (PUBLISHED only), with upcoming slots. */
export async function getPublicExperienceBySlug(slug: string, now: Date) {
  const experience = await prisma.experience.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      operator: { select: { id: true, businessName: true } },
      category: { select: { name: true, slug: true } },
      options: {
        orderBy: { price: "asc" },
        include: {
          slots: {
            where: { startTime: { gte: now } },
            orderBy: { startTime: "asc" },
          },
        },
      },
    },
  });

  if (!experience) {
    throw ApiError.notFound("Experience not found");
  }
  return experience;
}
