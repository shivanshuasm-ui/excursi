"use client";

import { apiJson } from "./client";
import type { AuthUser, CreateOrderResponse } from "./types";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadCheckoutScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load payment gateway"));
    document.body.appendChild(script);
  });
}

/**
 * Open the Razorpay checkout for a created order and verify the result on the
 * backend. Used when the backend runs with real Razorpay keys (order.provider
 * === "razorpay"). Resolves once the payment is verified and the booking
 * confirmed; rejects if cancelled or verification fails.
 */
export async function payWithRazorpay(
  order: CreateOrderResponse,
  bookingId: string,
  user: AuthUser | null,
): Promise<void> {
  await loadCheckoutScript();
  if (!window.Razorpay) throw new Error("Payment gateway unavailable");

  await new Promise<void>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: "excursi",
      description: "Experience booking",
      prefill: user ? { name: user.name, email: user.email } : undefined,
      theme: { color: "#0d9488" },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          await apiJson("/payments/verify", {
            method: "POST",
            auth: true,
            body: {
              bookingId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            },
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      },
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rzp.open();
  });
}
