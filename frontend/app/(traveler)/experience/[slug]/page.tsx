import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatPrice, getExperience } from "@/lib/api";
import type { Option } from "@/lib/types";

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        {experience.category && (
          <span className="font-medium text-brand">
            {experience.category.name}
          </span>
        )}
        {experience.destination && <span>· {experience.destination}</span>}
      </div>
      <h1 className="text-3xl font-bold text-slate-900">{experience.title}</h1>
      <p className="mt-1 text-sm text-slate-500">
        by {experience.operator.businessName}
      </p>

      {/* Gallery */}
      {gallery.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {gallery.slice(0, 3).map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt={`${experience.title} ${i + 1}`}
              className={`w-full rounded-xl object-cover ${
                i === 0 ? "sm:col-span-2 sm:row-span-2 aspect-video" : "aspect-square"
              }`}
            />
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Left: description, itinerary, inclusions */}
        <div className="lg:col-span-2">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Overview</h2>
            <p className="mt-2 whitespace-pre-line text-slate-700">
              {experience.description}
            </p>
          </section>

          {experience.itinerary && experience.itinerary.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-slate-900">Itinerary</h2>
              <ol className="mt-3 space-y-3">
                {experience.itinerary.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-slate-900">{step.title}</p>
                      {step.description && (
                        <p className="text-sm text-slate-600">
                          {step.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {experience.inclusions && experience.inclusions.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-slate-900">
                What's included
              </h2>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {experience.inclusions.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-700">
                    <span className="text-brand">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Right: options + slots */}
        <aside className="lg:col-span-1">
          <div className="sticky top-4 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Choose an option
            </h2>
            {experience.options.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {experience.options.map((option) => (
                  <OptionRow key={option.id} option={option} />
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                No options available yet.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function OptionRow({ option }: { option: Option }) {
  const upcoming = option.slots.slice(0, 3);
  return (
    <li className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-slate-900">{option.name}</p>
          <p className="text-xs text-slate-500">
            {option.durationMinutes} min
          </p>
        </div>
        <p className="font-semibold text-slate-900">
          {formatPrice(option.price, option.currency)}
        </p>
      </div>

      {upcoming.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {upcoming.map((slot) => (
            <span
              key={slot.id}
              className={`rounded border px-2 py-0.5 text-xs ${
                slot.availableCapacity > 0
                  ? "border-slate-200 text-slate-600"
                  : "border-slate-100 text-slate-300 line-through"
              }`}
            >
              {formatDate(slot.startTime)}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-400">No upcoming dates</p>
      )}

      <button
        type="button"
        className="mt-3 w-full rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark"
      >
        Select
      </button>
    </li>
  );
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}
