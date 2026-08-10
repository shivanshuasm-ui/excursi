import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import type {
  CreateOptionInput,
  CreateSlotInput,
  ListSlotsQuery,
  UpdateOptionInput,
} from "../validators/option.schema.js";

/** Assert the operator owns the experience an option belongs (or would belong) to. */
async function assertExperienceOwned(experienceId: string, operatorId: string) {
  const experience = await prisma.experience.findUnique({
    where: { id: experienceId },
    select: { operatorId: true },
  });
  if (!experience) {
    throw ApiError.notFound("Experience not found");
  }
  if (experience.operatorId !== operatorId) {
    throw ApiError.forbidden("You do not own this experience");
  }
}

/** Load an option and assert the given operator owns its parent experience. */
async function getOwnedOption(optionId: string, operatorId: string) {
  const option = await prisma.option.findUnique({
    where: { id: optionId },
    include: { experience: { select: { operatorId: true } } },
  });
  if (!option) {
    throw ApiError.notFound("Option not found");
  }
  if (option.experience.operatorId !== operatorId) {
    throw ApiError.forbidden("You do not own this option");
  }
  return option;
}

export async function createOption(
  experienceId: string,
  operatorId: string,
  input: CreateOptionInput,
) {
  await assertExperienceOwned(experienceId, operatorId);
  return prisma.option.create({
    data: {
      experienceId,
      name: input.name,
      price: input.price,
      currency: input.currency,
      capacity: input.capacity,
      durationMinutes: input.durationMinutes,
    },
  });
}

export async function updateOption(
  optionId: string,
  operatorId: string,
  input: UpdateOptionInput,
) {
  await getOwnedOption(optionId, operatorId);
  return prisma.option.update({
    where: { id: optionId },
    data: input,
  });
}

export async function createSlot(
  optionId: string,
  operatorId: string,
  input: CreateSlotInput,
) {
  await getOwnedOption(optionId, operatorId);
  return prisma.timeSlot.create({
    data: {
      optionId,
      type: input.type,
      startTime: input.startTime,
      endTime: input.endTime,
      totalCapacity: input.totalCapacity,
      // Availability starts full; bookings decrement it on confirm (Phase 3).
      availableCapacity: input.totalCapacity,
    },
  });
}

/**
 * List slots for an option. Public read (used by the traveler detail page),
 * so no ownership check. Optional YYYY-MM-DD filter narrows to a single day.
 */
export async function listSlots(optionId: string, query: ListSlotsQuery) {
  const option = await prisma.option.findUnique({ where: { id: optionId } });
  if (!option) {
    throw ApiError.notFound("Option not found");
  }

  let where: { optionId: string; startTime?: { gte: Date; lt: Date } } = {
    optionId,
  };

  if (query.date) {
    const start = new Date(`${query.date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    where = { optionId, startTime: { gte: start, lt: end } };
  }

  return prisma.timeSlot.findMany({
    where,
    orderBy: { startTime: "asc" },
  });
}
