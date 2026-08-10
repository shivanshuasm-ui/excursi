import Link from "next/link";
import type { ExperienceCard as Card } from "@/lib/types";
import { formatPrice } from "@/lib/api";
import { formatCount, pseudoRating } from "@/lib/ratings";
import { displayPricing } from "@/lib/pricing";
import { SmartImage } from "./SmartImage";

export function ExperienceCard({ experience }: { experience: Card }) {
  const cover = experience.gallery?.[0];
  const { rating, reviews, topRated } = pseudoRating(experience.id);
  const pricing =
    experience.fromPrice !== null
      ? displayPricing(experience.id, experience.fromPrice)
      : null;

  return (
    <Link
      href={`/experience/${experience.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition hover:shadow-pop"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <SmartImage
          src={cover}
          alt={experience.title}
          seed={experience.id}
          className="h-full w-full"
          imgClassName="transition duration-300 group-hover:scale-105"
        />
        {topRated && (
          <span className="badge-dark absolute left-3 top-3 z-10 shadow-card">
            Top rated
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {experience.category && (
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
            {experience.category.name}
            {experience.destination ? ` · ${experience.destination}` : ""}
          </span>
        )}
        <h3 className="mt-1 line-clamp-2 font-bold leading-snug text-ink">
          {experience.title}
        </h3>

        <div className="mt-2 flex items-center gap-1 text-sm">
          <span className="rating-star">★</span>
          <span className="font-bold text-ink">{rating}</span>
          <span className="text-muted">({formatCount(reviews)})</span>
        </div>

        <div className="mt-auto pt-3 text-sm">
          <span className="text-muted">From </span>
          {pricing && (
            <del className="text-muted">
              {formatPrice(pricing.original, experience.currency ?? "INR")}
            </del>
          )}{" "}
          <span className="font-bold text-brand">
            {formatPrice(experience.fromPrice, experience.currency ?? "INR")}
          </span>
          <span className="text-muted"> per person</span>
        </div>
      </div>
    </Link>
  );
}
