import crypto from "node:crypto";
import { env } from "../config/env.js";

/**
 * Razorpay payment provider.
 *
 * When RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are set, orders are created via
 * the live Razorpay API and signatures are verified with the real secret.
 * When they are absent, the module runs in a local **mock mode**: orders get a
 * synthetic id and signatures are HMAC'd with a fixed mock secret, so the whole
 * booking→pay→confirm flow is exercisable end-to-end without live credentials.
 */

const MOCK_SECRET = "mock_razorpay_secret";
const MOCK_KEY_ID = "rzp_test_mock";

export const paymentsConfigured = Boolean(
  env.razorpay.keyId && env.razorpay.keySecret,
);

function secret(): string {
  return env.razorpay.keySecret ?? MOCK_SECRET;
}

/** Public key id safe to hand to the client SDK. */
export function publicKeyId(): string {
  return env.razorpay.keyId ?? MOCK_KEY_ID;
}

export interface ProviderOrder {
  id: string;
  amount: number; // in the currency's smallest unit (paise for INR)
  currency: string;
}

/** Create a payment order with the provider (or a mock in local mode). */
export async function createProviderOrder(params: {
  amountMinor: number;
  currency: string;
  receipt: string;
}): Promise<ProviderOrder> {
  if (paymentsConfigured) {
    const auth = Buffer.from(
      `${env.razorpay.keyId}:${env.razorpay.keySecret}`,
    ).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: params.amountMinor,
        currency: params.currency,
        receipt: params.receipt,
      }),
    });
    if (!res.ok) {
      throw new Error(`Razorpay order creation failed (${res.status})`);
    }
    const data = (await res.json()) as ProviderOrder;
    return { id: data.id, amount: data.amount, currency: data.currency };
  }

  // Mock mode.
  const id = `order_mock_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`;
  return { id, amount: params.amountMinor, currency: params.currency };
}

/** Verify the `orderId|paymentId` HMAC signature returned by the checkout. */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", secret())
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Compute a valid signature for a mock payment. Only meaningful in mock mode —
 * exposed so a test client (or a dev "Pay" button) can simulate the callback
 * the real Razorpay checkout would produce.
 */
export function computeMockSignature(
  orderId: string,
  paymentId: string,
): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}
