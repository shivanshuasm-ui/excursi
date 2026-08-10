import type { BookingStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { paymentsConfigured } from "../lib/payments.js";
import type {
  CreateBookingInput,
  OperatorBookingsQuery,
  UpdateBookingStatusInput,
} from "../validators/booking.schema.js";

/** A booking holds seat capacity while it is PENDING or CONFIRMED. */
function holdsCapacity(status: BookingStatus): boolean {
  return status === "PENDING" || status === "CONFIRMED";
}

/**
 * Create a booking and reserve seats on the slot.
 *
 * The reservation is the atomic guard against overbooking: the conditional
 * `updateMany` (WHERE availableCapacity >= seats) takes a row lock in Postgres,
 * so concurrent bookings serialize and the loser's WHERE fails (count 0) rather
 * than driving capacity negative. Booking + Payment rows are created in the same
 * transaction so a failure rolls the reservation back.
 *
 * Payment then moves the booking PENDING -> CONFIRMED without touching capacity,
 * which is already held here.
 */
export async function createBooking(
  userId: string,
  input: CreateBookingInput,
  now: Date,
) {
  const slot = await prisma.timeSlot.findUnique({
    where: { id: input.slotId },
    include: { option: { include: { experience: true } } },
  });
  if (!slot) {
    throw ApiError.notFound("Slot not found");
  }

  const { option } = slot;
  const { experience } = option;
  if (experience.status !== "PUBLISHED") {
    throw ApiError.badRequest("Experience is not available for booking");
  }
  if (slot.startTime <= now) {
    throw ApiError.badRequest("Cannot book a slot in the past");
  }

  const seats = input.adults + input.kids;
  // Option price is per person (per seat). Kids currently priced the same as
  // adults; a kid discount can layer on here later.
  const total = Number((Number(option.price) * seats).toFixed(2));

  return prisma.$transaction(async (tx) => {
    const reserved = await tx.timeSlot.updateMany({
      where: { id: slot.id, availableCapacity: { gte: seats } },
      data: { availableCapacity: { decrement: seats } },
    });
    if (reserved.count === 0) {
      throw ApiError.conflict("Not enough capacity for this slot");
    }

    const booking = await tx.booking.create({
      data: {
        userId,
        experienceId: experience.id,
        optionId: option.id,
        slotId: slot.id,
        adults: input.adults,
        kids: input.kids,
        totalAmount: total,
        currency: option.currency,
        status: "PENDING",
      },
    });

    const payment = await tx.payment.create({
      data: {
        bookingId: booking.id,
        amount: total,
        currency: option.currency,
        provider: paymentsConfigured ? "razorpay" : "mock",
        status: "CREATED",
      },
    });

    return { booking, payment };
  });
}

export async function listMyBookings(userId: string) {
  return prisma.booking.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      experience: { select: { title: true, slug: true } },
      option: { select: { name: true, durationMinutes: true } },
      slot: { select: { startTime: true, endTime: true } },
      payment: { select: { status: true, provider: true } },
    },
  });
}

export async function listOperatorBookings(
  operatorId: string,
  query: OperatorBookingsQuery,
) {
  return prisma.booking.findMany({
    where: {
      experience: { operatorId },
      ...(query.status ? { status: query.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      experience: { select: { title: true, slug: true } },
      option: { select: { name: true } },
      slot: { select: { startTime: true, endTime: true } },
      payment: { select: { status: true } },
    },
  });
}

/**
 * Transition a booking to COMPLETED or CANCELLED.
 *
 * - The booking owner (traveler) may CANCEL their own booking.
 * - The operator who owns the experience may COMPLETE or CANCEL it.
 * Cancelling a booking that still holds capacity releases the seats back to the
 * slot, and refunds a paid payment. All done in one transaction.
 */
export async function updateBookingStatus(
  actorUserId: string,
  bookingId: string,
  input: UpdateBookingStatusInput,
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      experience: { select: { operatorId: true } },
      payment: { select: { status: true } },
    },
  });
  if (!booking) {
    throw ApiError.notFound("Booking not found");
  }

  const isOwner = booking.userId === actorUserId;
  let isOperator = false;
  if (!isOwner) {
    const operator = await prisma.operator.findUnique({
      where: { userId: actorUserId },
      select: { id: true },
    });
    isOperator = Boolean(operator && operator.id === booking.experience.operatorId);
  }
  if (!isOwner && !isOperator) {
    throw ApiError.forbidden("Not allowed to modify this booking");
  }

  if (!holdsCapacity(booking.status)) {
    throw ApiError.conflict(`Booking is already ${booking.status}`);
  }

  const target = input.status;
  if (target === "COMPLETED") {
    if (!isOperator) {
      throw ApiError.forbidden("Only the operator can complete a booking");
    }
    if (booking.status !== "CONFIRMED") {
      throw ApiError.conflict("Only confirmed bookings can be completed");
    }
  }

  const seats = booking.adults + booking.kids;

  return prisma.$transaction(async (tx) => {
    if (target === "CANCELLED") {
      // Release the held seats back to the slot.
      await tx.timeSlot.update({
        where: { id: booking.slotId },
        data: { availableCapacity: { increment: seats } },
      });
      if (booking.payment?.status === "PAID") {
        await tx.payment.update({
          where: { bookingId: booking.id },
          data: { status: "REFUNDED" },
        });
      }
    }

    return tx.booking.update({
      where: { id: booking.id },
      data: { status: target },
      include: { payment: { select: { status: true } } },
    });
  });
}
