"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { ApiError, apiJson } from "@/lib/client";
import { formatPrice } from "@/lib/api";
import type { BookingStatus, MyBooking } from "@/lib/types";

const STATUS_STYLES: Record<BookingStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-slate-200 text-slate-700",
  CANCELLED: "bg-red-100 text-red-700",
};

// (status pill colors kept semantic; layout uses the GYG palette below)

export function MyBookings() {
  const { user, loading: authLoading } = useAuth();
  const params = useSearchParams();
  const justBooked = params.get("booked") === "1";

  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<{ bookings: MyBooking[] }>("/bookings/me", {
        auth: true,
      });
      setBookings(data.bookings);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) load();
    else if (!authLoading) setLoading(false);
  }, [authLoading, user, load]);

  async function cancel(id: string) {
    setCancelling(id);
    try {
      await apiJson(`/bookings/${id}/status`, {
        method: "PATCH",
        auth: true,
        body: { status: "CANCELLED" },
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel.");
    } finally {
      setCancelling(null);
    }
  }

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-muted">Please sign in to see your bookings.</p>
        <Link href="/login?next=/my-bookings" className="btn-brand mt-4">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-extrabold text-ink">My bookings</h1>

      {justBooked && (
        <p className="mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          🎉 Booking confirmed! Details are below.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : bookings.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-8 text-center">
          <p className="text-muted">You have no bookings yet.</p>
          <Link href="/search" className="mt-2 inline-block font-bold text-brand">
            Explore experiences →
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {bookings.map((b) => (
            <li
              key={b.id}
              className="rounded-2xl border border-line bg-white p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link
                    href={`/experience/${b.experience.slug}`}
                    className="font-bold text-ink hover:text-brand"
                  >
                    {b.experience.title}
                  </Link>
                  <p className="mt-0.5 text-sm text-muted">
                    {b.option.name} · {formatDateTime(b.slot.startTime)}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {b.adults} adult{b.adults > 1 ? "s" : ""}
                    {b.kids > 0 ? `, ${b.kids} kid${b.kids > 1 ? "s" : ""}` : ""}{" "}
                    · {formatPrice(b.totalAmount, b.currency)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[b.status]}`}
                >
                  {b.status}
                </span>
              </div>

              {(b.status === "PENDING" || b.status === "CONFIRMED") &&
                new Date(b.slot.startTime) > new Date() && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => cancel(b.id)}
                      disabled={cancelling === b.id}
                      className="btn-outline disabled:opacity-60"
                    >
                      {cancelling === b.id ? "Cancelling…" : "Cancel booking"}
                    </button>
                  </div>
                )}
            </li>
          ))}
        </ul>
      )}
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
