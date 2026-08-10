# excursi-frontend

Next.js (App Router) traveler-facing web app for Excursi. Talks to
`excursi-backend` over REST.

## Setup

```bash
cd frontend
cp .env.example .env.local     # point API_URL / NEXT_PUBLIC_API_URL at the backend
npm install
npm run dev                    # http://localhost:3000 (backend expected on :4000)
```

The backend's `CORS_ORIGIN` must include this app's origin (default
`http://localhost:3000`).

## Scripts

| Script            | Description                          |
|-------------------|--------------------------------------|
| `npm run dev`     | Dev server                           |
| `npm run build`   | Production build                     |
| `npm start`       | Serve the production build           |
| `npm run typecheck` | `tsc --noEmit`                     |

## What's built (traveler flow)

- **Browse** — landing (ISR) with hero search, category chips, featured grid;
  `/search` (dynamic) with destination/category/date/price filters, free-text,
  sort, and pagination via URL params.
- **Detail** — `/experience/[slug]` (ISR on demand) with gallery, itinerary,
  inclusions, and a client `BookingPanel` (option → slot → party size →
  checkout). SEO/OpenGraph metadata.
- **Auth** — `/login` and `/signup` backed by a client `AuthProvider`
  (React context). Tokens live in `localStorage`; the API client refreshes the
  access token on a 401 and retries once. `?next=` preserves the post-auth
  destination.
- **Checkout** — `/checkout` reserves the booking, creates a payment order, and
  completes it. In **mock mode** (backend without Razorpay keys) it calls
  `/payments/mock-confirm`; with real keys it opens the Razorpay checkout and
  verifies the signature.
- **My Bookings** — `/my-bookings` lists the traveler's bookings with status,
  and cancels upcoming ones.

## Data layer

- `lib/api.ts` — server-side fetch (list/detail/categories) with ISR
  revalidation; degrades gracefully when the API is down so builds don't fail.
- `lib/client.ts` — browser fetch client with token storage + refresh.
- `lib/types.ts` — shared API response types.

## Stack

Next.js 16 (App Router, React 19) + Tailwind CSS. Server components for public
catalog pages (SSR/ISR); client components for anything auth- or
interaction-driven.

> Not yet built: operator dashboard and admin panel UIs, and Phase 6 polish
> (tablet QA, notifications). The backend for those already exists.
