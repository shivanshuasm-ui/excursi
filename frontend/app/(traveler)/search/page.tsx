import Link from "next/link";
import type { Metadata } from "next";
import { listCategories, listExperiences } from "@/lib/api";
import { ExperienceCard } from "@/components/ExperienceCard";
import { SearchFilters } from "@/components/SearchFilters";
import type {
  Category,
  ExperienceFilters,
  ExperienceListResponse,
} from "@/lib/types";

export const metadata: Metadata = { title: "Explore experiences" };

// Reading searchParams makes this route dynamic (rendered per request).
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<ExperienceFilters>;
}) {
  const filters = await searchParams;
  let data: ExperienceListResponse = {
    items: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
  let categories: Category[] = [];
  let failed = false;
  try {
    [data, categories] = await Promise.all([
      listExperiences(filters),
      listCategories(),
    ]);
  } catch {
    failed = true;
  }

  const { items, pagination } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        Explore experiences
      </h1>

      <SearchFilters categories={categories} />

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {failed
            ? "Could not load experiences."
            : `${pagination.total} result${pagination.total === 1 ? "" : "s"}`}
        </p>
      </div>

      {items.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((exp) => (
            <ExperienceCard key={exp.id} experience={exp} />
          ))}
        </div>
      ) : (
        !failed && (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No experiences match your filters.
          </p>
        )
      )}

      {pagination.totalPages > 1 && (
        <Pagination
          current={pagination.page}
          total={pagination.totalPages}
          searchParams={filters}
        />
      )}
    </div>
  );
}

function Pagination({
  current,
  total,
  searchParams,
}: {
  current: number;
  total: number;
  searchParams: ExperienceFilters;
}) {
  const href = (page: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v && k !== "page") params.set(k, String(v));
    }
    params.set("page", String(page));
    return `/search?${params.toString()}`;
  };

  return (
    <nav className="mt-8 flex items-center justify-center gap-1">
      {Array.from({ length: total }, (_, i) => i + 1).map((page) => (
        <Link
          key={page}
          href={href(page)}
          className={`min-w-9 rounded-md border px-3 py-1.5 text-center text-sm ${
            page === current
              ? "border-brand bg-brand text-white"
              : "border-slate-200 bg-white text-slate-700 hover:border-brand"
          }`}
        >
          {page}
        </Link>
      ))}
    </nav>
  );
}
