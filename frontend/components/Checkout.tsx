"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import { ApiError, apiJson } from "@/lib/client";
import { payWithRazorpay } from "@/lib/razorpay";
import { formatPrice } from "@/lib/api";
import type {
  CreateOrderResponse,
  ExperienceDetail,
} from "@/lib/types";

export function Checkout() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const slug = params.get("slug") ?? "";
  const optionId = params.get("option") ?? "";
  const slotId = params.get("slot") ?? "";
  const adults = Math.max(1, Number(params.get("adults") ?? 1));
  const kids = Math.max(0, Number(params.get("kids") ?? 0));

  const [experience, setExperience] = useState<ExperienceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    apiJson<{ experience: ExperienceDetail }>(`/experiences/${slug}`)
      .then((d) => setExperience(d.experience))
      .catch(() => setExperience(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const option = useMemo(
    () => experience?.options.find((o) => o.id === optionId),
    [experience, optionId],
  );
  const slot = useMemo(
    () => option?.slots.find((s) => s.id === slotId),
    [option, slotId],
  );

  const seats = adults + kids;
  const total = option ? Number(option.price) * seats : 0;
  const currency = option?.currency ?? "INR";
  const nextUrl = `/checkout?${params.toString()}`;

  async function pay() {
    setError(null);
    setPaying(true);
    try {
      const booking = await apiJson<{ booking: { id: string } }>("/bookings", {
        method: "POST",
        auth: true,
        body: { slotId, adults, kids },
      });
      const order = await apiJson<CreateOrderResponse>(
        "/payments/create-order",
        { method: "POST", auth: true, body: { bookingId: booking.booking.id } },
      );

      if (order.provider === "mock") {
        await apiJson("/payments/mock-confirm", {
          method: "POST",
          auth: true,
          body: { bookingId: booking.booking.id },
        });
      } else {
        await payWithRazorpay(order, booking.booking.id, user);
      }

      router.push("/my-bookings?booked=1");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Payment could not be completed.",
      );
      setPaying(false);
    }
  }

  if (loading) {
    return <Centered>Loading…</Centered>;
  }
  if (!experience || !option || !slot) {
    return (
      <Centered>
        <p className="text-slate-600">This booking selection is invalid.</p>
        <Link href="/search" className="mt-2 font-medium text-brand">
          Browse experiences
        </Link>
      </Centered>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-extrabold text-ink">Review & pay</h1>

      <div className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="font-bold text-ink">{experience.title}</h2>
        <p className="text-sm text-muted">
          {experience.operator.businessName}
        </p>

        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Option" value={option.name} />
          <Row label="Date & time" value={formatDateTime(slot.startTime)} />
          <Row
            label="Guests"
            value={`${adults} adult${adults > 1 ? "s" : ""}${
              kids > 0 ? `, ${kids} kid${kids > 1 ? "s" : ""}` : ""
            }`}
          />
          <Row
            label={`${formatPrice(option.price, currency)} × ${seats}`}
            value={formatPrice(total, currency)}
          />
        </dl>

        <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
          <span className="font-semibold text-muted">Total</span>
          <span className="text-xl font-extrabold text-ink">
            {formatPrice(total, currency)}
          </span>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!authLoading && !user ? (
        <Link
          href={`/login?next=${encodeURIComponent(nextUrl)}`}
          className="btn-brand mt-6 w-full"
        >
          Sign in to complete booking
        </Link>
      ) : (
        <button
          type="button"
          onClick={pay}
          disabled={paying || authLoading}
          className="btn-brand mt-6 w-full"
        >
          {paying ? "Processing…" : `Pay ${formatPrice(total, currency)}`}
        </button>
      )}
      <p className="mt-3 text-center text-xs text-muted">
        Your seats are held the moment you confirm — no double bookings.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      {children}
    </div>
  );
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
