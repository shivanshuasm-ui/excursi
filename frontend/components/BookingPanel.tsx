"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/api";
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
  const total = option ? Number(option.price) * seats : 0;
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
    return (
      <p className="text-sm text-slate-500">No options available yet.</p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Option */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Option
        </label>
        <select
          value={optionId}
          onChange={(e) => {
            setOptionId(e.target.value);
            setSlotId("");
          }}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} — {formatPrice(o.price, o.currency)}
            </option>
          ))}
        </select>
      </div>

      {/* Slot */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Date & time
        </label>
        {bookableSlots.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {bookableSlots.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSlotId(s.id)}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  slotId === s.id
                    ? "border-brand bg-brand text-white"
                    : "border-slate-300 text-slate-700 hover:border-brand"
                }`}
              >
                {formatDateTime(s.startTime)}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No upcoming dates available.</p>
        )}
      </div>

      {/* Party size */}
      <div className="grid grid-cols-2 gap-3">
        <Stepper label="Adults" value={adults} min={1} onChange={setAdults} />
        <Stepper label="Kids" value={kids} min={0} onChange={setKids} />
      </div>

      {/* Total + CTA */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-3">
        <span className="text-sm text-slate-500">Total</span>
        <span className="text-lg font-semibold text-slate-900">
          {formatPrice(total, option?.currency ?? "INR")}
        </span>
      </div>
      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
        className="w-full rounded-md bg-brand px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {slotId ? "Continue to checkout" : "Select a date"}
      </button>
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
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      <div className="flex items-center rounded-md border border-slate-300">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="px-3 py-1.5 text-slate-500 hover:text-brand"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="flex-1 text-center text-sm">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="px-3 py-1.5 text-slate-500 hover:text-brand"
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
