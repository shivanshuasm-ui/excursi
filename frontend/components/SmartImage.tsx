"use client";

import { useState } from "react";

/** Deterministic pleasant gradient from a seed, so placeholders look intentional. */
function gradientFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const hue2 = (hue + 35) % 360;
  return `linear-gradient(135deg, hsl(${hue} 65% 55%), hsl(${hue2} 70% 42%))`;
}

/**
 * Image with a graceful fallback. Renders a seeded gradient behind the image;
 * if the src is missing or fails to load, the gradient + a photo icon stay
 * visible instead of a broken-image / alt-text box. Operator gallery URLs are
 * arbitrary remote links, so this keeps the UI intact when one 404s.
 */
export function SmartImage({
  src,
  alt,
  seed,
  className = "",
  imgClassName = "",
}: {
  src?: string | null;
  alt: string;
  seed?: string;
  className?: string;
  imgClassName?: string;
}) {
  const [ok, setOk] = useState(true);
  const showImg = Boolean(src) && ok;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: gradientFor(seed ?? alt) }}
      role="img"
      aria-label={alt}
    >
      {!showImg && (
        <div className="absolute inset-0 grid place-items-center text-white/70">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <rect
              x="3"
              y="5"
              width="18"
              height="14"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
            <path
              d="m4 17 4.5-4.5 3 3L16 11l4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      {showImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`}
        />
      )}
    </div>
  );
}
