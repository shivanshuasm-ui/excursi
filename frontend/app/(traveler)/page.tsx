import Link from "next/link";
import { listCategories, listExperiences } from "@/lib/api";
import { ExperienceCard } from "@/components/ExperienceCard";
import type { Category, ExperienceCard as Card } from "@/lib/types";

// Landing is statically generated and revalidated (ISR).
export const revalidate = 60;

export default async function HomePage() {
  let featured: Card[] = [];
  let categories: Category[] = [];
  try {
    const [list, cats] = await Promise.all([
      listExperiences({ sort: "newest" }),
      listCategories(),
    ]);
    featured = list.items.slice(0, 8);
    categories = cats;
  } catch {
    // Backend unavailable — render the shell with empty sections.
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(120% 120% at 80% 0%, #ff5533 0%, transparent 45%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-24">
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight text-white sm:text-5xl">
            Find and book unforgettable experiences
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-200">
            Tours, activities, and local adventures from trusted operators —
            with free cancellation.
          </p>
          <form
            action="/search"
            className="mt-8 flex max-w-xl items-center gap-2 rounded-full bg-white p-2 shadow-pop"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="ml-2 text-muted"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path
                d="m20 20-3-3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <input
              name="q"
              placeholder="Search experiences or destinations…"
              className="w-full bg-transparent px-1 text-ink outline-none placeholder:text-muted"
            />
            <button type="submit" className="btn-brand rounded-full px-6">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="mb-4 text-lg font-bold text-ink">Browse by category</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/search?category=${c.slug}`}
                className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl font-extrabold text-ink">
            Popular experiences
          </h2>
          <Link
            href="/search"
            className="text-sm font-bold text-brand hover:underline"
          >
            View all →
          </Link>
        </div>
        {featured.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((exp) => (
              <ExperienceCard key={exp.id} experience={exp} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-muted">
            No experiences published yet. Check back soon.
          </p>
        )}
      </section>
    </div>
  );
}
