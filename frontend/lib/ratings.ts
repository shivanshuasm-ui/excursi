/**
 * Placeholder rating for the GetYourGuide-style UI. The backend has no reviews
 * model yet, so this derives a *stable* rating/review-count from the experience
 * id purely for presentation. Replace with real review data when available.
 */
export function pseudoRating(id: string): {
  rating: number;
  reviews: number;
  topRated: boolean;
} {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  const rating = 4.3 + (h % 7) / 10; // 4.3 – 4.9
  const reviews = 180 + (h % 44000);
  return {
    rating: Number(rating.toFixed(1)),
    reviews,
    topRated: rating >= 4.6,
  };
}

export function formatCount(n: number): string {
  try {
    return new Intl.NumberFormat("en-IN").format(n);
  } catch {
    return String(n);
  }
}
