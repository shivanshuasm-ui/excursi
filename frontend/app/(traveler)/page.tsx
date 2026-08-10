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
      <section className="bg-gradient-to-br from-brand to-brand-dark">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center text-white">
          <h1 className="text-4xl font-bold sm:text-5xl">
            Find your next experience
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-teal-50">
            Tours, activities, and local adventures from trusted operators.
          </p>
          <form
            action="/search"
            className="mx-auto mt-8 flex max-w-md gap-2"
          >
            <input
              type="text"
              name="q"
              placeholder="Search experiences…"
              className="flex-1 rounded-md px-4 py-3 text-slate-900 outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/search?category=${c.slug}`}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-brand hover:text-brand"
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
          <h2 className="text-2xl font-bold text-slate-900">
            Featured experiences
          </h2>
          <Link href="/search" className="text-sm font-medium text-brand">
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
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No experiences published yet. Check back soon.
          </p>
        )}
      </section>
    </div>
  );
}
