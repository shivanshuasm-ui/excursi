/**
 * Display-only "discount" for the GetYourGuide-style price block: a stable,
 * seed-derived struck-through original price shown above the real price.
 *
 * IMPORTANT: `discounted` is the actual option price and the only amount ever
 * charged. `original` is a presentational anchor (like the placeholder rating)
 * — the backend has no promotions model. Wire to real pricing when it exists.
 */
export function displayPricing(
  seed: string,
  price: number,
): { discounted: number; original: number; save: number } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const pct = 0.15 + (h % 31) / 100; // 15% – 45%
  const original = Math.max(price + 1, Math.round((price / (1 - pct)) / 10) * 10);
  const save = Math.round((1 - price / original) * 100);
  return { discounted: price, original, save };
}
