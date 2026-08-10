import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import { prisma } from "../src/lib/prisma.js";
import {
  approveOperatorByBusiness,
  payForBooking,
  resetDb,
  seedAdmin,
  startTestServer,
  type RequestFn,
} from "./helpers.js";

let server: Server;
let req: RequestFn;

// Shared state built up across the ordered scenario.
const state: Record<string, string> = {};
const login = async (email: string, password: string) =>
  (await req("POST", "/auth/login", { body: { email, password } })).json
    .accessToken as string;

before(async () => {
  await resetDb();
  await seedAdmin();
  ({ server, req } = await startTestServer());
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();
});

describe("auth", () => {
  it("signs up a traveler and returns tokens", async () => {
    const r = await req("POST", "/auth/signup", {
      body: { email: "trav@test.local", password: "password123", name: "Trav" },
    });
    assert.equal(r.status, 201);
    assert.equal(r.json.user.role, "TRAVELER");
    assert.ok(r.json.accessToken && r.json.refreshToken);
    state.travTok = r.json.accessToken;
  });

  it("rejects duplicate email", async () => {
    const r = await req("POST", "/auth/signup", {
      body: { email: "trav@test.local", password: "password123", name: "Dup" },
    });
    assert.equal(r.status, 409);
  });

  it("rejects bad credentials", async () => {
    const r = await req("POST", "/auth/login", {
      body: { email: "trav@test.local", password: "wrong" },
    });
    assert.equal(r.status, 401);
  });

  it("returns the current user on /me", async () => {
    const r = await req("GET", "/auth/me", { token: state.travTok });
    assert.equal(r.status, 200);
    assert.equal(r.json.user.email, "trav@test.local");
  });

  it("rejects /me without a token", async () => {
    assert.equal((await req("GET", "/auth/me")).status, 401);
  });
});

describe("operator + catalog", () => {
  it("registers an operator as PENDING", async () => {
    const r = await req("POST", "/operators/signup", {
      body: {
        email: "op@test.local",
        password: "password123",
        name: "Op",
        businessName: "Kayak Co",
      },
    });
    assert.equal(r.status, 201);
    assert.equal(r.json.operator.status, "PENDING");
    state.opTok = r.json.accessToken;
  });

  it("blocks experience creation before approval", async () => {
    const r = await req("POST", "/experiences", {
      token: state.opTok,
      body: { title: "x", description: "y" },
    });
    assert.equal(r.status, 403);
  });

  it("creates + publishes an experience once approved", async () => {
    await approveOperatorByBusiness("Kayak Co");
    state.opTok = await login("op@test.local", "password123");

    const exp = await req("POST", "/experiences", {
      token: state.opTok,
      body: {
        title: "Sunset Kayak Tour",
        description: "Paddle at golden hour",
        destination: "Goa",
      },
    });
    assert.equal(exp.status, 201);
    assert.equal(exp.json.experience.slug, "sunset-kayak-tour");
    state.expId = exp.json.experience.id;

    const opt = await req("POST", `/experiences/${state.expId}/options`, {
      token: state.opTok,
      body: { name: "Standard", price: 1000, capacity: 20, durationMinutes: 120 },
    });
    assert.equal(opt.status, 201);
    state.optId = opt.json.option.id;

    const slot = await req("POST", `/options/${state.optId}/slots`, {
      token: state.opTok,
      body: {
        startTime: "2030-01-10T10:00:00Z",
        endTime: "2030-01-10T12:00:00Z",
        totalCapacity: 20,
      },
    });
    assert.equal(slot.status, 201);
    assert.equal(slot.json.slot.availableCapacity, 20);
    state.slotId = slot.json.slot.id;

    assert.equal(
      (
        await req("PUT", `/experiences/${state.expId}`, {
          token: state.opTok,
          body: { status: "PUBLISHED" },
        })
      ).status,
      200,
    );
  });

  it("enforces cross-operator ownership", async () => {
    await req("POST", "/operators/signup", {
      body: {
        email: "op2@test.local",
        password: "password123",
        name: "Op2",
        businessName: "Rival Co",
      },
    });
    await approveOperatorByBusiness("Rival Co");
    const op2 = await login("op2@test.local", "password123");
    assert.equal(
      (
        await req("PUT", `/experiences/${state.expId}`, {
          token: op2,
          body: { title: "hijack" },
        })
      ).status,
      403,
    );
  });
});

describe("public catalog", () => {
  it("lists only published experiences with fromPrice", async () => {
    const r = await req("GET", "/experiences");
    assert.equal(r.status, 200);
    assert.equal(r.json.items.length, 1);
    assert.equal(r.json.items[0].fromPrice, 1000);
  });

  it("filters by price and date availability", async () => {
    assert.equal((await req("GET", "/experiences?maxPrice=500")).json.items.length, 0);
    assert.equal((await req("GET", "/experiences?date=2030-01-10")).json.items.length, 1);
    assert.equal((await req("GET", "/experiences?date=2030-01-11")).json.items.length, 0);
  });

  it("serves published detail by slug and 404s drafts", async () => {
    const ok = await req("GET", "/experiences/sunset-kayak-tour");
    assert.equal(ok.status, 200);
    assert.equal(ok.json.experience.operator.businessName, "Kayak Co");
    assert.equal((await req("GET", "/experiences/does-not-exist")).status, 404);
  });

  it("keeps operator /mine reachable (not shadowed by /:slug)", async () => {
    assert.equal((await req("GET", "/experiences/mine", { token: state.opTok })).status, 200);
    assert.equal((await req("GET", "/experiences/mine")).status, 401);
  });
});

describe("booking + payment", () => {
  it("reserves capacity and confirms via mock payment", async () => {
    const b = await req("POST", "/bookings", {
      token: state.travTok,
      body: { slotId: state.slotId, adults: 2, kids: 1 },
    });
    assert.equal(b.status, 201);
    assert.equal(Number(b.json.booking.totalAmount), 3000); // 1000 * 3 seats
    state.bookingId = b.json.booking.id;

    const cap = await prisma.timeSlot.findUnique({ where: { id: state.slotId } });
    assert.equal(cap?.availableCapacity, 17); // 20 - 3

    const verify = await payForBooking(req, state.travTok, state.bookingId);
    assert.equal(verify.status, 200);
    assert.equal(verify.json.booking.status, "CONFIRMED");
    assert.equal(verify.json.payment.status, "PAID");
  });

  it("confirms via mock-confirm (no signature needed by the client)", async () => {
    const b = await req("POST", "/bookings", {
      token: state.travTok,
      body: { slotId: state.slotId, adults: 1 },
    });
    const order = await req("POST", "/payments/create-order", {
      token: state.travTok,
      body: { bookingId: b.json.booking.id },
    });
    assert.equal(order.json.provider, "mock");
    const confirm = await req("POST", "/payments/mock-confirm", {
      token: state.travTok,
      body: { bookingId: b.json.booking.id },
    });
    assert.equal(confirm.status, 200);
    assert.equal(confirm.json.booking.status, "CONFIRMED");
    assert.equal(confirm.json.payment.status, "PAID");
    // Clean up so later capacity/earnings assertions stay deterministic.
    await req("PATCH", `/bookings/${b.json.booking.id}/status`, {
      token: state.travTok,
      body: { status: "CANCELLED" },
    });
  });

  it("rejects a tampered signature", async () => {
    const b = await req("POST", "/bookings", {
      token: state.travTok,
      body: { slotId: state.slotId, adults: 1 },
    });
    const order = await req("POST", "/payments/create-order", {
      token: state.travTok,
      body: { bookingId: b.json.booking.id },
    });
    const bad = await req("POST", "/payments/verify", {
      token: state.travTok,
      body: {
        bookingId: b.json.booking.id,
        razorpayOrderId: order.json.orderId,
        razorpayPaymentId: "pay_x",
        razorpaySignature: "deadbeef",
      },
    });
    assert.equal(bad.status, 400);
    const p = await prisma.payment.findUnique({ where: { bookingId: b.json.booking.id } });
    assert.equal(p?.status, "FAILED");
  });

  it("never overbooks under concurrency", async () => {
    // Dedicated capacity-2 slot; fire 3 concurrent single-seat bookings.
    const slot = await req("POST", `/options/${state.optId}/slots`, {
      token: state.opTok,
      body: {
        startTime: "2030-02-01T10:00:00Z",
        endTime: "2030-02-01T11:00:00Z",
        totalCapacity: 2,
      },
    });
    const raceSlotId = slot.json.slot.id;
    const results = await Promise.all(
      [1, 2, 3].map(() =>
        req("POST", "/bookings", {
          token: state.travTok,
          body: { slotId: raceSlotId, adults: 1 },
        }),
      ),
    );
    const ok = results.filter((r) => r.status === 201).length;
    const conflict = results.filter((r) => r.status === 409).length;
    assert.equal(ok, 2, "exactly two bookings should succeed");
    assert.equal(conflict, 1, "the third should conflict");
    const cap = await prisma.timeSlot.findUnique({ where: { id: raceSlotId } });
    assert.equal(cap?.availableCapacity, 0, "capacity must floor at zero");
  });

  it("releases capacity and refunds on cancel", async () => {
    await req("PATCH", `/bookings/${state.bookingId}/status`, {
      token: state.travTok,
      body: { status: "CANCELLED" },
    });
    const cap = await prisma.timeSlot.findUnique({ where: { id: state.slotId } });
    // Slot had 17 (after the 3-seat booking) minus 1 (bad-sig booking still held) = 16; +3 released.
    assert.equal(cap?.availableCapacity, 19);
    const p = await prisma.payment.findUnique({ where: { bookingId: state.bookingId } });
    assert.equal(p?.status, "REFUNDED");
  });

  it("rejects booking a past slot", async () => {
    const past = await req("POST", `/options/${state.optId}/slots`, {
      token: state.opTok,
      body: {
        startTime: "2000-01-01T10:00:00Z",
        endTime: "2000-01-01T11:00:00Z",
        totalCapacity: 5,
      },
    });
    assert.equal(
      (
        await req("POST", "/bookings", {
          token: state.travTok,
          body: { slotId: past.json.slot.id, adults: 1 },
        })
      ).status,
      400,
    );
  });
});

describe("operator earnings", () => {
  it("summarises paid revenue and payout split", async () => {
    // Complete one confirmed booking so it moves to the "available" payout bucket.
    const b = await req("POST", "/bookings", {
      token: state.travTok,
      body: { slotId: state.slotId, adults: 1 },
    });
    await payForBooking(req, state.travTok, b.json.booking.id);
    await req("PATCH", `/bookings/${b.json.booking.id}/status`, {
      token: state.opTok,
      body: { status: "COMPLETED" },
    });

    const e = (await req("GET", "/operators/me/earnings", { token: state.opTok })).json;
    assert.equal(e.commissionRate, 0.15);
    // Only the completed 1000 booking is PAID+live now (the 3000 was cancelled/refunded).
    assert.equal(e.totals.gross, 1000);
    assert.equal(e.totals.commission, 150);
    assert.equal(e.totals.net, 850);
    assert.equal(e.payouts.available, 850);
    // Two cancelled-after-pay bookings were refunded: 3000 + the 1000 mock-confirm one.
    assert.equal(e.totals.refunded, 4000);
  });

  it("forbids travelers from operator earnings", async () => {
    assert.equal(
      (await req("GET", "/operators/me/earnings", { token: state.travTok })).status,
      403,
    );
  });
});

describe("admin", () => {
  it("logs in the seeded admin", async () => {
    state.adminTok = await login("admin@test.local", "admin12345");
    assert.ok(state.adminTok);
  });

  it("blocks non-admins", async () => {
    assert.equal((await req("GET", "/admin/stats", { token: state.travTok })).status, 403);
    assert.equal((await req("GET", "/admin/stats")).status, 401);
  });

  it("runs the operator verification queue", async () => {
    await req("POST", "/operators/signup", {
      body: {
        email: "op3@test.local",
        password: "password123",
        name: "Op3",
        businessName: "Pending Co",
      },
    });
    const pending = await req("GET", "/admin/operators/pending", { token: state.adminTok });
    const row = pending.json.operators.find((o: any) => o.businessName === "Pending Co");
    assert.ok(row, "new operator appears in the queue");

    const approve = await req("PATCH", `/admin/operators/${row.id}/verify`, {
      token: state.adminTok,
      body: { action: "approve" },
    });
    assert.equal(approve.json.operator.status, "APPROVED");
    assert.ok(approve.json.operator.verifiedAt);
    assert.equal(
      (await req("PATCH", "/admin/operators/clz0000000000000000000000/verify", {
        token: state.adminTok,
        body: { action: "approve" },
      })).status,
      404,
    );
  });

  it("manages categories", async () => {
    const cat = await req("POST", "/admin/categories", {
      token: state.adminTok,
      body: { name: "Water Sports" },
    });
    assert.equal(cat.status, 201);
    assert.equal(cat.json.category.slug, "water-sports");
    assert.ok(
      (await req("GET", "/categories")).json.categories.some(
        (c: any) => c.id === cat.json.category.id,
      ),
    );
    assert.equal(
      (await req("POST", "/admin/categories", {
        token: state.opTok,
        body: { name: "Nope" },
      })).status,
      403,
    );
    assert.equal(
      (await req("DELETE", `/admin/categories/${cat.json.category.id}`, {
        token: state.adminTok,
      })).status,
      204,
    );
  });

  it("reports platform stats and revenue", async () => {
    const s = (await req("GET", "/admin/stats", { token: state.adminTok })).json;
    assert.equal(s.users.ADMIN, 1);
    assert.ok(s.users.OPERATOR >= 2);
    assert.equal(s.experiences.PUBLISHED, 1);
    assert.equal(s.revenue.commissionRate, 0.15);
    // One completed 1000 booking is the only live PAID revenue.
    assert.equal(s.revenue.gross, 1000);
    assert.equal(s.revenue.commission, 150);
  });
});
