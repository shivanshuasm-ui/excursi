import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getExperience } from "@/lib/api";
import { BookingPanel } from "@/components/BookingPanel";
import { SmartImage } from "@/components/SmartImage";
import { formatCount, pseudoRating } from "@/lib/ratings";

// ISR: detail pages are generated on demand and revalidated (Phase 2 decision).
export const revalidate = 120;
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const experience = await getExperience(slug);
  if (!experience) return { title: "Experience not found" };
  return {
    title: experience.title,
    description: experience.description.slice(0, 160),
    openGraph: {
      title: experience.title,
      description: experience.description.slice(0, 160),
      images: experience.gallery?.slice(0, 1),
    },
  };
}

export default async function ExperiencePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const experience = await getExperience(slug);
  if (!experience) notFound();

  const gallery = experience.gallery ?? [];
  const { rating, reviews, topRated } = pseudoRating(experience.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Title */}
      <h1 className="text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
        {experience.title}
      </h1>

      {/* Badge + rating row */}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {topRated && <span className="badge-dark">Top rated</span>}
        <span className="flex items-center gap-1 text-sm">
          <span className="rating-star">★</span>
          <span className="font-bold text-ink">{rating}</span>
          <span className="text-brand underline-offset-2 hover:underline">
            ({formatCount(reviews)} reviews)
          </span>
        </span>
        {experience.destination && (
          <span className="text-sm text-muted">· {experience.destination}</span>
        )}
      </div>

      {/* Grid: gallery + content | sticky booking widget */}
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_349px]">
        <div className="min-w-0">
          {/* Gallery */}
          <div className="grid h-[380px] grid-cols-3 grid-rows-2 gap-2 overflow-hidden rounded-2xl">
            <SmartImage
              src={gallery[0]}
              alt={experience.title}
              seed={`${experience.id}-0`}
              className="col-span-2 row-span-2 h-full w-full"
            />
            <SmartImage
              src={gallery[1]}
              alt={`${experience.title} photo 2`}
              seed={`${experience.id}-1`}
              className="h-full w-full"
            />
            <SmartImage
              src={gallery[2]}
              alt={`${experience.title} photo 3`}
              seed={`${experience.id}-2`}
              className="h-full w-full"
            />
          </div>

          {/* Overview */}
          <section className="mt-8">
            <h2 className="text-xl font-bold text-ink">Overview</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700">
              {experience.description}
            </p>
          </section>

          {experience.itinerary && experience.itinerary.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-bold text-ink">Itinerary</h2>
              <ol className="mt-4 space-y-4 border-l-2 border-line pl-6">
                {experience.itinerary.map((step, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[31px] grid h-6 w-6 place-items-center rounded-full bg-brand text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <p className="font-semibold text-ink">{step.title}</p>
                    {step.description && (
                      <p className="text-sm text-muted">{step.description}</p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {experience.inclusions && experience.inclusions.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-bold text-ink">What's included</h2>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {experience.inclusions.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-700">
                    <span className="text-discount">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-8 text-xs text-muted">
            Offered by {experience.operator.businessName}
          </p>
        </div>

        {/* Sticky booking widget */}
        <aside>
          <div className="sticky top-24 rounded-2xl border border-line bg-white p-5 shadow-card">
            <BookingPanel slug={experience.slug} options={experience.options} />
          </div>
        </aside>
      </div>
    </div>
  );
}
