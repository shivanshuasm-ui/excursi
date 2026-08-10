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
      className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => e.preventDefault()}
    >
      <Field label="Search">
        <input
          type="text"
          defaultValue={value("q")}
          placeholder="Kayaking, food tour…"
          onBlur={(e) => update({ q: e.target.value })}
          className="input"
        />
      </Field>

      <Field label="Destination">
        <input
          type="text"
          defaultValue={value("destination")}
          placeholder="Goa, Rishikesh…"
          onBlur={(e) => update({ destination: e.target.value })}
          className="input"
        />
      </Field>

      <Field label="Category">
        <select
          defaultValue={value("category")}
          onChange={(e) => update({ category: e.target.value })}
          className="input"
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
          className="input"
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
            className="input"
          />
          <span className="text-slate-400">–</span>
          <input
            type="number"
            min={0}
            placeholder="Max"
            defaultValue={value("maxPrice")}
            onBlur={(e) => update({ maxPrice: e.target.value })}
            className="input"
          />
        </div>
      </Field>

      <Field label="Sort by">
        <select
          defaultValue={value("sort") || "newest"}
          onChange={(e) => update({ sort: e.target.value })}
          className="input"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(203 213 225);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        :global(.input:focus) {
          border-color: #0d9488;
          box-shadow: 0 0 0 1px #0d9488;
        }
      `}</style>
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
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}
