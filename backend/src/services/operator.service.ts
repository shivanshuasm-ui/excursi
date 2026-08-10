import type { BookingStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { hashPassword } from "../utils/password.js";
import { issueTokens } from "../utils/jwt.js";
import { toPublicUser } from "./auth.service.js";
import type {
  OperatorSignupInput,
  OperatorUpdateInput,
} from "../validators/operator.schema.js";

/**
 * Registers an operator: creates a User (role OPERATOR) and a PENDING Operator
 * profile in one transaction. The account can log in immediately but cannot
 * publish experiences until an admin approves it.
 */
export async function signupOperator(input: OperatorSignupInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw ApiError.conflict("Email already registered");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      phone: input.phone,
      role: "OPERATOR",
      operator: {
        create: {
          businessName: input.businessName,
          description: input.description,
          status: "PENDING",
        },
      },
    },
    include: { operator: true },
  });

  const tokens = issueTokens({ sub: user.id, role: user.role });
  return { user: toPublicUser(user), operator: user.operator, ...tokens };
}

export async function getOperatorByUserId(userId: string) {
  const operator = await prisma.operator.findUnique({
    where: { userId },
  });
  if (!operator) {
    throw ApiError.notFound("Operator profile not found");
  }
  return operator;
}

export async function updateOperator(
  operatorId: string,
  input: OperatorUpdateInput,
) {
  return prisma.operator.update({
    where: { id: operatorId },
    data: input,
  });
}

// ─── Earnings / payouts (Phase 4) ────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Earnings & payout summary for an operator dashboard.
 *
 * Revenue is recognised only from bookings whose payment is PAID. Of those:
 *   - CONFIRMED  → experience not yet delivered → payout is "pending"
 *   - COMPLETED  → delivered → payout is "available"
 * The platform keeps `commissionRate`; the operator's net is the remainder.
 * REFUNDED payments (cancelled-after-pay) are reported separately.
 *
 * Amounts assume a single currency (INR by default); the `currency` field
 * reflects the operator's bookings. Aggregation runs in-memory (MVP scale).
 */
export async function getOperatorEarnings(operatorId: string) {
  const rate = env.platform.commissionRate;

  const bookings = await prisma.booking.findMany({
    where: { experience: { operatorId } },
    select: {
      status: true,
      totalAmount: true,
      currency: true,
      experienceId: true,
      experience: { select: { title: true } },
      payment: { select: { status: true } },
    },
  });

  const counts: Record<Lowercase<BookingStatus>, number> = {
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  };

  let gross = 0;
  let refunded = 0;
  let pendingPayout = 0;
  let availablePayout = 0;
  let currency = "INR";

  const byExperience = new Map<
    string,
    { experienceId: string; title: string; bookings: number; gross: number; net: number }
  >();

  for (const b of bookings) {
    counts[b.status.toLowerCase() as Lowercase<BookingStatus>] += 1;
    currency = b.currency;
    const amount = Number(b.totalAmount);
    const paymentStatus = b.payment?.status;

    if (paymentStatus === "REFUNDED") {
      refunded += amount;
      continue;
    }

    // Only PAID bookings that are still live (not cancelled) count as revenue.
    if (paymentStatus !== "PAID") continue;
    if (b.status !== "CONFIRMED" && b.status !== "COMPLETED") continue;

    const net = amount * (1 - rate);
    gross += amount;
    if (b.status === "CONFIRMED") pendingPayout += net;
    else availablePayout += net;

    const row =
      byExperience.get(b.experienceId) ??
      { experienceId: b.experienceId, title: b.experience.title, bookings: 0, gross: 0, net: 0 };
    row.bookings += 1;
    row.gross += amount;
    row.net += net;
    byExperience.set(b.experienceId, row);
  }

  const commission = gross * rate;

  return {
    currency,
    commissionRate: rate,
    totals: {
      gross: round2(gross),
      commission: round2(commission),
      net: round2(gross - commission),
      refunded: round2(refunded),
    },
    payouts: {
      pending: round2(pendingPayout), // confirmed, awaiting delivery
      available: round2(availablePayout), // completed, payable
    },
    bookings: { total: bookings.length, ...counts },
    byExperience: Array.from(byExperience.values())
      .map((r) => ({ ...r, gross: round2(r.gross), net: round2(r.net) }))
      .sort((a, b) => b.gross - a.gross),
  };
}
