import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import {
  computeMockSignature,
  createProviderOrder,
  paymentsConfigured,
  publicKeyId,
  verifyPaymentSignature,
} from "../lib/payments.js";
import type {
  CreateOrderInput,
  VerifyPaymentInput,
} from "../validators/payment.schema.js";

/**
 * Create a provider payment order for a PENDING booking. Returns the fields the
 * client checkout SDK needs. Capacity was already reserved when the booking was
 * created, so this only prepares the charge.
 */
export async function createOrder(userId: string, input: CreateOrderInput) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { payment: true },
  });
  if (!booking) {
    throw ApiError.notFound("Booking not found");
  }
  if (booking.userId !== userId) {
    throw ApiError.forbidden("Not your booking");
  }
  if (booking.status !== "PENDING") {
    throw ApiError.conflict(`Booking is ${booking.status}; cannot pay`);
  }
  if (!booking.payment) {
    throw ApiError.badRequest("Booking has no payment record");
  }

  // Razorpay works in the currency's minor unit (paise for INR).
  const amountMinor = Math.round(Number(booking.payment.amount) * 100);
  const order = await createProviderOrder({
    amountMinor,
    currency: booking.currency,
    receipt: booking.id,
  });

  await prisma.payment.update({
    where: { bookingId: booking.id },
    data: { orderId: order.id, provider: paymentsConfigured ? "razorpay" : "mock" },
  });

  return {
    bookingId: booking.id,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: publicKeyId(),
    provider: paymentsConfigured ? "razorpay" : "mock",
  };
}

/**
 * Verify the checkout callback signature and, on success, mark the payment PAID
 * and the booking CONFIRMED in one transaction. Capacity is untouched (held at
 * booking creation).
 */
export async function verifyPayment(userId: string, input: VerifyPaymentInput) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { payment: true },
  });
  if (!booking) {
    throw ApiError.notFound("Booking not found");
  }
  if (booking.userId !== userId) {
    throw ApiError.forbidden("Not your booking");
  }
  if (!booking.payment) {
    throw ApiError.badRequest("Booking has no payment record");
  }
  if (booking.payment.orderId !== input.razorpayOrderId) {
    throw ApiError.badRequest("Order id does not match this booking");
  }
  if (booking.status !== "PENDING") {
    throw ApiError.conflict(`Booking is ${booking.status}; nothing to verify`);
  }

  const valid = verifyPaymentSignature(
    input.razorpayOrderId,
    input.razorpayPaymentId,
    input.razorpaySignature,
  );
  if (!valid) {
    await prisma.payment.update({
      where: { bookingId: booking.id },
      data: { status: "FAILED", paymentId: input.razorpayPaymentId },
    });
    throw ApiError.badRequest("Invalid payment signature");
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { bookingId: booking.id },
      data: {
        status: "PAID",
        paymentId: input.razorpayPaymentId,
        signature: input.razorpaySignature,
      },
    });
    const confirmed = await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED" },
    });
    return { booking: confirmed, payment };
  });
}

/**
 * Dev-only shortcut: simulate a successful payment when Razorpay is not
 * configured (mock mode). The frontend can't produce a valid signature — that
 * needs the server secret — so this computes one server-side and runs the same
 * verify path. Disabled whenever real Razorpay keys are set.
 */
export async function mockConfirm(userId: string, input: CreateOrderInput) {
  if (paymentsConfigured) {
    throw ApiError.badRequest(
      "Mock payment is disabled; complete the Razorpay checkout instead",
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { payment: true },
  });
  if (!booking) {
    throw ApiError.notFound("Booking not found");
  }
  if (booking.userId !== userId) {
    throw ApiError.forbidden("Not your booking");
  }
  if (!booking.payment?.orderId) {
    throw ApiError.badRequest("Create a payment order first");
  }

  const paymentId = `pay_mock_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`;
  const signature = computeMockSignature(booking.payment.orderId, paymentId);
  return verifyPayment(userId, {
    bookingId: booking.id,
    razorpayOrderId: booking.payment.orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: signature,
  });
}
