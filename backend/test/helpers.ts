import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/utils/password.js";
import { computeMockSignature } from "../src/lib/payments.js";

export interface Res {
  status: number;
  json: any;
}

export type RequestFn = (
  method: string,
  path: string,
  opts?: { token?: string; body?: unknown },
) => Promise<Res>;

/** Start the Express app on an ephemeral port; returns a bound request helper. */
export async function startTestServer(): Promise<{
  server: Server;
  base: string;
  req: RequestFn;
}> {
  const app = createApp();
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}/api`;

  const req: RequestFn = async (method, path, { token, body } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      /* no body */
    }
    return { status: res.status, json };
  };

  return { server, base, req };
}

/** Truncate every table so each run starts from a known-empty database. */
export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE payments, bookings, time_slots, options, experiences, categories, operators, users RESTART IDENTITY CASCADE`,
  );
}

/** Seed an ADMIN user directly (admins are never self-registered). */
export async function seedAdmin(
  email = "admin@test.local",
  password = "admin12345",
): Promise<void> {
  await prisma.user.create({
    data: {
      email,
      name: "Test Admin",
      passwordHash: await hashPassword(password),
      role: "ADMIN",
    },
  });
}

/** Approve an operator by business name (test shortcut around the admin flow). */
export async function approveOperatorByBusiness(
  businessName: string,
): Promise<void> {
  await prisma.operator.updateMany({
    where: { businessName },
    data: { status: "APPROVED", verifiedAt: new Date() },
  });
}

/** Drive a mock Razorpay payment for a booking through create-order + verify. */
export async function payForBooking(
  req: RequestFn,
  token: string,
  bookingId: string,
): Promise<Res> {
  const order = await req("POST", "/payments/create-order", {
    token,
    body: { bookingId },
  });
  const paymentId = `pay_test_${bookingId.slice(-8)}`;
  const signature = computeMockSignature(order.json.orderId, paymentId);
  return req("POST", "/payments/verify", {
    token,
    body: {
      bookingId,
      razorpayOrderId: order.json.orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    },
  });
}
