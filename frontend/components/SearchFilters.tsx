"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { Category } from "@/lib/types";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export function SearchFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const update = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      next.delete("page"); // any filter change resets to page 1
      router.push(`/search?${next.toString()}`);
    },
    [params, router],
  );

  const value = (key: string) => params.get(key) ?? "";

  return (
    <form
      className="grid gap-4 rounded-2xl border border-line bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => e.preventDefault()}
    >
      <Field label="Search">
        <input
          type="text"
          defaultValue={value("q")}
          placeholder="Kayaking, food tour…"
          onBlur={(e) => update({ q: e.target.value })}
          className="field"
        />
      </Field>

      <Field label="Destination">
        <input
          type="text"
          defaultValue={value("destination")}
          placeholder="Goa, Rishikesh…"
          onBlur={(e) => update({ destination: e.target.value })}
          className="field"
        />
      </Field>

      <Field label="Category">
        <select
          defaultValue={value("category")}
          onChange={(e) => update({ category: e.target.value })}
          className="field"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Date">
        <input
          type="date"
          defaultValue={value("date")}
          onChange={(e) => update({ date: e.target.value })}
          className="field"
        />
      </Field>

      <Field label="Price range">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="Min"
            defaultValue={value("minPrice")}
            onBlur={(e) => update({ minPrice: e.target.value })}
            className="field"
          />
          <span className="text-slate-400">–</span>
          <input
            type="number"
            min={0}
            placeholder="Max"
            defaultValue={value("maxPrice")}
            onBlur={(e) => update({ maxPrice: e.target.value })}
            className="field"
          />
        </div>
      </Field>

      <Field label="Sort by">
        <select
          defaultValue={value("sort") || "newest"}
          onChange={(e) => update({ sort: e.target.value })}
          className="field"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
