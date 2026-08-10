import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import type {
  AdminBookingsQuery,
  VerifyOperatorInput,
} from "../validators/admin.schema.js";

/** Operators awaiting verification (the admin approval queue). */
export async function listPendingOperators() {
  return prisma.operator.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      _count: { select: { experiences: true } },
    },
  });
}

/** Approve or reject an operator. */
export async function verifyOperator(
  operatorId: string,
  input: VerifyOperatorInput,
) {
  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
  });
  if (!operator) {
    throw ApiError.notFound("Operator not found");
  }

  const approved = input.action === "approve";
  return prisma.operator.update({
    where: { id: operatorId },
    data: {
      status: approved ? "APPROVED" : "REJECTED",
      verifiedAt: approved ? new Date() : null,
    },
  });
}

/** Platform-wide bookings with optional status filter and pagination. */
export async function listAllBookings(query: AdminBookingsQuery) {
  const where = query.status ? { status: query.status } : {};
  const [total, items] = await prisma.$transaction([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        user: { select: { name: true, email: true } },
        experience: {
          select: {
            title: true,
            slug: true,
            operator: { select: { businessName: true } },
          },
        },
        option: { select: { name: true } },
        slot: { select: { startTime: true } },
        payment: { select: { status: true } },
      },
    }),
  ]);

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

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Fold a Prisma groupBy result into a keyed count map over known keys. */
function countsByKey<T extends string>(
  rows: Array<{ _count: number } & Record<string, unknown>>,
  field: string,
  keys: readonly T[],
): Record<T, number> {
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<T, number>;
  for (const row of rows) {
    const key = row[field] as T;
    if (key in out) out[key] = row._count;
  }
  return out;
}

/** Platform-wide dashboard statistics. */
export async function getStats() {
  const [userRows, operatorRows, experienceRows, bookingRows, revenue] =
    await Promise.all([
      prisma.user.groupBy({ by: ["role"], _count: true, orderBy: { role: "asc" } }),
      prisma.operator.groupBy({
        by: ["status"],
        _count: true,
        orderBy: { status: "asc" },
      }),
      prisma.experience.groupBy({
        by: ["status"],
        _count: true,
        orderBy: { status: "asc" },
      }),
      prisma.booking.groupBy({
        by: ["status"],
        _count: true,
        orderBy: { status: "asc" },
      }),
      prisma.booking.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: { in: ["CONFIRMED", "COMPLETED"] },
          payment: { status: "PAID" },
        },
      }),
    ]);

  const users = countsByKey(userRows, "role", [
    "TRAVELER",
    "OPERATOR",
    "ADMIN",
  ] as const);
  const operators = countsByKey(operatorRows, "status", [
    "PENDING",
    "APPROVED",
    "REJECTED",
  ] as const);
  const experiences = countsByKey(experienceRows, "status", [
    "DRAFT",
    "PUBLISHED",
    "ARCHIVED",
  ] as const);
  const bookings = countsByKey(bookingRows, "status", [
    "PENDING",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
  ] as const);

  const gross = Number(revenue._sum.totalAmount ?? 0);
  const commission = gross * env.platform.commissionRate;

  const sum = (o: Record<string, number>) =>
    Object.values(o).reduce((a, b) => a + b, 0);

  return {
    users: { total: sum(users), ...users },
    operators: { total: sum(operators), ...operators },
    experiences: { total: sum(experiences), ...experiences },
    bookings: { total: sum(bookings), ...bookings },
    revenue: {
      currency: "INR",
      gross: round2(gross),
      commission: round2(commission),
      commissionRate: env.platform.commissionRate,
    },
  };
}
