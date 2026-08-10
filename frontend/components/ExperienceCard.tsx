import Link from "next/link";
import type { ExperienceCard as Card } from "@/lib/types";
import { formatPrice } from "@/lib/api";

export function ExperienceCard({ experience }: { experience: Card }) {
  const cover = experience.gallery?.[0];
  return (
    <Link
      href={`/experience/${experience.slug}`}
      className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-md"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={experience.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            No image
          </div>
        )}
      </div>
      <div className="p-4">
        {experience.category && (
          <span className="text-xs font-medium uppercase tracking-wide text-brand">
            {experience.category.name}
          </span>
        )}
        <h3 className="mt-1 line-clamp-2 font-semibold text-slate-900">
          {experience.title}
        </h3>
        {experience.destination && (
          <p className="mt-1 text-sm text-slate-500">{experience.destination}</p>
        )}
        <p className="mt-3 text-sm text-slate-600">
          <span className="text-xs text-slate-400">from </span>
          <span className="font-semibold text-slate-900">
            {formatPrice(experience.fromPrice, experience.currency ?? "INR")}
          </span>
        </p>
      </div>
    </Link>
  );
}
