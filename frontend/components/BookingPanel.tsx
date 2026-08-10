"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/api";
import { displayPricing } from "@/lib/pricing";
import type { Option } from "@/lib/types";

export function BookingPanel({
  slug,
  options,
}: {
  slug: string;
  options: Option[];
}) {
  const router = useRouter();
  const [optionId, setOptionId] = useState(options[0]?.id ?? "");
  const [slotId, setSlotId] = useState("");
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);

  const option = useMemo(
    () => options.find((o) => o.id === optionId),
    [options, optionId],
  );
  const bookableSlots = useMemo(
    () => (option?.slots ?? []).filter((s) => s.availableCapacity > 0),
    [option],
  );
  const seats = adults + kids;
  const unitPrice = option ? Number(option.price) : 0;
  const total = unitPrice * seats;
  const currency = option?.currency ?? "INR";
  const pricing = displayPricing(option?.id ?? slug, unitPrice);
  const canContinue = Boolean(option && slotId && seats > 0);

  function onContinue() {
    if (!canContinue) return;
    const params = new URLSearchParams({
      slug,
      option: optionId,
      slot: slotId,
      adults: String(adults),
      kids: String(kids),
    });
    router.push(`/checkout?${params.toString()}`);
  }

  if (options.length === 0) {
    return <p className="text-sm text-muted">No options available yet.</p>;
  }

  return (
    <div>
      {/* Price header (GYG-style: struck original + discounted price) */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-muted">
            From{" "}
            <del className="text-muted">
              {formatPrice(pricing.original, currency)}
            </del>
          </p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-extrabold text-brand">
              {formatPrice(pricing.discounted, currency)}
            </span>
            <span className="pb-1 text-sm text-muted">per person</span>
          </div>
        </div>
        {pricing.save > 0 && (
          <span className="mt-0.5 shrink-0 rounded-md bg-discount/10 px-2 py-1 text-xs font-bold text-discount">
            Save {pricing.save}%
          </span>
        )}
      </div>

      <hr className="my-4 border-line" />

      {/* Option */}
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
        Option
      </label>
      <select
        value={optionId}
        onChange={(e) => {
          setOptionId(e.target.value);
          setSlotId("");
        }}
        className="field"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} — {formatPrice(o.price, o.currency)}
          </option>
        ))}
      </select>

      {/* Slot */}
      <label className="mb-1 mt-4 block text-xs font-bold uppercase tracking-wide text-muted">
        Date & time
      </label>
      {bookableSlots.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {bookableSlots.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSlotId(s.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                slotId === s.id
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line text-ink hover:border-brand"
              }`}
            >
              {formatDateTime(s.startTime)}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No upcoming dates available.</p>
      )}

      {/* Guests */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stepper label="Adults" value={adults} min={1} onChange={setAdults} />
        <Stepper label="Kids" value={kids} min={0} onChange={setKids} />
      </div>

      {/* Total */}
      <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
        <span className="text-sm font-semibold text-muted">Total</span>
        <span className="text-xl font-extrabold text-ink">
          {formatPrice(total, currency)}
        </span>
      </div>

      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
        className="btn-brand mt-3 w-full"
      >
        {slotId ? "Check availability" : "Select a date"}
      </button>

      <div className="mt-4 border-t border-line pt-4">
        <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
          <span className="text-discount">✓</span> Free cancellation
        </p>
        <p className="mt-0.5 text-xs text-muted">
          Cancel up to 24 hours in advance for a full refund.
        </p>
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      <div className="flex items-center rounded-lg border border-line">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="px-3 py-2 text-muted hover:text-brand"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="flex-1 text-center text-sm font-semibold">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="px-3 py-2 text-muted hover:text-brand"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
