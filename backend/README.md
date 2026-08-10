# excursi-backend

Node.js + Express + Prisma API for Excursi.

- **Phase 0** — scaffold, database schema, JWT auth.
- **Phase 1** — operator signup/profile + Experience / Option / TimeSlot CRUD.
- **Phase 2** — traveler-facing public catalog: search/filter listing, detail
  by slug, categories.
- **Phase 3** — booking flow (transactional, no-overbook) + Razorpay payments.
- **Phase 4** — operator dashboard: booking management (Phase 3) + earnings/payouts summary.
- **Phase 5** — admin panel: operator verification, platform bookings/stats, category management.

## Setup

```bash
cd backend
cp .env.example .env          # then fill in DATABASE_URL and JWT secrets
npm install
npm run prisma:generate       # generate the Prisma client
npm run prisma:migrate        # create/apply the initial migration
npm run dev                   # start on http://localhost:4000
```

## Scripts

| Script                    | Description                                  |
|---------------------------|----------------------------------------------|
| `npm run dev`             | Start the API in watch mode (tsx)            |
| `npm run build`           | Compile TypeScript to `dist/`                |
| `npm start`               | Run the compiled server                      |
| `npm run typecheck`       | Type-check without emitting                  |
| `npm run prisma:generate` | Generate the Prisma client                   |
| `npm run prisma:migrate`  | Create and apply a dev migration             |
| `npm run prisma:studio`   | Open Prisma Studio                           |
| `npm run seed:admin`      | Seed/promote the platform admin (env-driven) |

## Auth API

| Method | Path                | Auth        | Body                                  |
|--------|---------------------|-------------|---------------------------------------|
| POST   | `/api/auth/signup`  | —           | `email, password, name, phone?`       |
| POST   | `/api/auth/login`   | —           | `email, password`                     |
| POST   | `/api/auth/refresh` | —           | `refreshToken`                        |
| GET    | `/api/auth/me`      | Bearer      | —                                     |

`signup` and `login` return `{ user, accessToken, refreshToken }`. Send the
access token as `Authorization: Bearer <token>` on protected routes.

### Roles & middleware

- `authenticate` — verifies the Bearer access token, attaches `req.user`.
- `requireRole(...roles)` — gates a route to `TRAVELER` / `OPERATOR` / `ADMIN`.

Signup only mints `TRAVELER` accounts. Operators register via
`POST /api/operators/signup` and admins are seeded.

## Operator API (Phase 1)

Operators register through their own endpoint and start as `PENDING`. They can
log in and edit their profile immediately, but **creating or modifying catalog
data requires an `APPROVED` operator** (admin approval lands in Phase 5; for now
flip `operators.status` directly).

| Method | Path                              | Auth                | Notes                                  |
|--------|-----------------------------------|---------------------|----------------------------------------|
| POST   | `/api/operators/signup`           | —                   | Creates User(OPERATOR) + PENDING profile |
| GET    | `/api/operators/me`               | Operator            | Own operator profile                   |
| PUT    | `/api/operators/me`               | Operator            | Update business name / description      |
| GET    | `/api/operators/me/earnings`      | Operator            | Earnings & payouts summary (Phase 4)   |
| POST   | `/api/experiences`                | Operator (approved) | Create experience (auto-slug, DRAFT)   |
| GET    | `/api/experiences/mine`           | Operator            | List own experiences (+ options)       |
| GET    | `/api/experiences/mine/:id`       | Operator            | Own experience detail (+ options/slots)|
| PUT    | `/api/experiences/:id`            | Operator (approved) | Partial update; set `status` to publish|
| DELETE | `/api/experiences/:id`            | Operator (approved) | Delete own experience (cascades)       |
| POST   | `/api/experiences/:id/options`    | Operator (approved) | Add an option/package                  |
| PUT    | `/api/options/:id`                | Operator (approved) | Update an option                       |
| POST   | `/api/options/:id/slots`          | Operator (approved) | Add a time slot (capacity seeds availability) |
| GET    | `/api/options/:id/slots?date=`    | Public              | List slots; optional `YYYY-MM-DD` filter |

Ownership is enforced on every write: an operator can only touch experiences,
options, and slots under experiences they own (cross-operator access → 403).
Publishing is a status transition — `PUT /api/experiences/:id` with
`{ "status": "PUBLISHED" }`.

## Public API (Phase 2)

Traveler-facing reads. Only `PUBLISHED` experiences are ever exposed.

| Method | Path                        | Notes                                        |
|--------|-----------------------------|----------------------------------------------|
| GET    | `/api/experiences`          | Listing with filters, search, sort, paging   |
| GET    | `/api/experiences/:slug`    | Detail (published only) + upcoming slots      |
| GET    | `/api/categories`           | Categories for filter UIs                    |

### `GET /api/experiences` query params

| Param         | Example            | Effect                                       |
|---------------|--------------------|----------------------------------------------|
| `q`           | `kayak`            | Free-text over title + description (ci)       |
| `destination` | `Goa`              | Substring match on destination (ci)          |
| `category`    | `water-sports`     | Category slug                                |
| `date`        | `2026-09-01`       | Only experiences with an available slot that day |
| `minPrice`    | `500`              | Cheapest option ≥ value                       |
| `maxPrice`    | `2000`             | Cheapest option ≤ value                       |
| `sort`        | `price_asc`        | `newest` (default), `price_asc`, `price_desc` |
| `page`        | `2`                | 1-based page (default 1)                      |
| `limit`       | `20`               | Page size (default 20, max 50)               |

Response shape:

```json
{
  "items": [
    { "id": "...", "slug": "sunset-kayak-tour", "title": "Sunset Kayak Tour",
      "destination": "Goa", "gallery": ["..."],
      "category": { "name": "Water Sports", "slug": "water-sports" },
      "fromPrice": 1499.5, "currency": "INR" }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 2, "totalPages": 1 }
}
```

`fromPrice` is the cheapest option's price. Price sorting and paging run
in-memory over the matched set (capped at 500) since the value is derived from
the option relation — fine at MVP scale; revisit with a denormalized
`fromPrice` column if catalogs grow large.

### Routing note

`/api/experiences` mixes public reads with operator writes. Route order matters:
the literal operator routes (`/mine`, `/mine/:id`) and all writes are registered
**before** the public single-segment `GET /:slug`, so the slug catch-all never
shadows them.

## Bookings & Payments (Phase 3)

| Method | Path                          | Auth      | Notes                                    |
|--------|-------------------------------|-----------|------------------------------------------|
| POST   | `/api/bookings`               | User      | Reserve seats; creates PENDING booking   |
| GET    | `/api/bookings/me`            | User      | Traveler's own bookings                  |
| GET    | `/api/bookings/operator`      | Operator  | Bookings across own experiences (`?status=`) |
| PATCH  | `/api/bookings/:id/status`    | User      | Traveler cancels own; operator completes/cancels |
| POST   | `/api/payments/create-order`  | User      | Create a Razorpay order for a booking    |
| POST   | `/api/payments/verify`        | User      | Verify signature → CONFIRMED + PAID      |

### Booking lifecycle

```
POST /bookings          reserve seats atomically, booking=PENDING, payment=CREATED
POST /payments/create-order   create provider order (amount in paise)
POST /payments/verify   HMAC check -> booking=CONFIRMED, payment=PAID
PATCH /bookings/:id/status    COMPLETED (operator) or CANCELLED (either)
```

**No overbooking.** Seats are reserved when the booking is created, not at
payment. The reservation is a single conditional update —
`UPDATE time_slots SET availableCapacity = availableCapacity - :seats
WHERE id = :id AND availableCapacity >= :seats` — which takes a Postgres row
lock, so concurrent bookings serialize and the loser's `WHERE` fails (409)
instead of driving capacity negative. Booking + payment rows are created in the
same transaction. Verified with a concurrency test (3 simultaneous bookings on a
2-seat slot → exactly 2 succeed, capacity floors at 0).

Cancelling a booking that still holds capacity (PENDING/CONFIRMED) releases the
seats back and refunds a paid payment, all in one transaction. COMPLETED
bookings keep their seats consumed.

Pricing: option price is **per seat** (`adults + kids`); kids are priced the
same as adults for now.

### Payments — mock mode

With `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` unset, payments run in a local
**mock mode**: `create-order` returns a synthetic `order_mock_…` id and
signatures are HMAC'd with a fixed mock secret, so the full book → pay → confirm
flow is testable without live keys. Set the two env vars to hit the real
Razorpay API and verify real signatures. Signature check is
`HMAC_SHA256(orderId + "|" + paymentId, keySecret)`, compared constant-time.

> Follow-up: a webhook endpoint and an expiry sweeper for abandoned PENDING
> reservations (they hold seats until cancelled) are not yet implemented.

## Operator earnings (Phase 4)

`GET /api/operators/me/earnings` returns a dashboard summary. Revenue is
recognised only from **PAID** bookings; the platform keeps
`PLATFORM_COMMISSION_RATE` (default 15%) and the operator's net is the rest.

- **Pending payout** — net of `CONFIRMED` bookings (paid, experience not yet delivered).
- **Available payout** — net of `COMPLETED` bookings (delivered, payable).
- **Refunded** — amount of `REFUNDED` payments (cancelled after payment), reported separately.

```json
{
  "currency": "INR",
  "commissionRate": 0.15,
  "totals":   { "gross": 3000, "commission": 450, "net": 2550, "refunded": 1000 },
  "payouts":  { "pending": 1700, "available": 850 },
  "bookings": { "total": 4, "pending": 1, "confirmed": 1, "completed": 1, "cancelled": 1 },
  "byExperience": [
    { "experienceId": "...", "title": "Dive Trip", "bookings": 2, "gross": 3000, "net": 2550 }
  ]
}
```

Aggregation runs in-memory over the operator's bookings (MVP scale) and assumes
a single currency.

## Admin API (Phase 5)

Every route requires an authenticated `ADMIN`. Admins are **never** self-
registered — seed one with `npm run seed:admin` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`);
the script is idempotent and promotes an existing user to `ADMIN` if needed.

| Method | Path                                   | Notes                                   |
|--------|----------------------------------------|-----------------------------------------|
| GET    | `/api/admin/operators/pending`         | Operator verification queue             |
| PATCH  | `/api/admin/operators/:id/verify`      | Body `{ "action": "approve" \| "reject" }` |
| GET    | `/api/admin/bookings`                  | Platform-wide bookings (`?status=`, `?page=`, `?limit=`) |
| GET    | `/api/admin/stats`                     | Platform dashboard counts + revenue     |
| POST   | `/api/admin/categories`                | Create category (auto-slug from name)   |
| PUT    | `/api/admin/categories/:id`            | Update category                         |
| DELETE | `/api/admin/categories/:id`            | Delete (experiences fall back to null)  |

Approving an operator sets `APPROVED` + `verifiedAt` and unlocks catalog writes
(the gate enforced in Phase 1); rejecting sets `REJECTED` and clears `verifiedAt`.

`GET /api/admin/stats` returns:

```json
{
  "users":       { "total": 3, "TRAVELER": 1, "OPERATOR": 1, "ADMIN": 1 },
  "operators":   { "total": 1, "PENDING": 0, "APPROVED": 1, "REJECTED": 0 },
  "experiences": { "total": 2, "DRAFT": 1, "PUBLISHED": 1, "ARCHIVED": 0 },
  "bookings":    { "total": 3, "PENDING": 1, "CONFIRMED": 2, "COMPLETED": 0, "CANCELLED": 0 },
  "revenue":     { "currency": "INR", "gross": 6000, "commission": 900, "commissionRate": 0.15 }
}
```

Revenue counts only PAID bookings that are CONFIRMED or COMPLETED; `commission`
is the platform's cut at `PLATFORM_COMMISSION_RATE`.

## Structure

```
src/
  config/env.ts          typed environment config
  lib/prisma.ts          PrismaClient singleton
  middleware/            authenticate, requireRole, validateBody, errorHandler
  routes/                route groups (auth wired; others follow)
  controllers/           thin HTTP handlers
  services/              business logic (auth)
  validators/            zod request schemas
  utils/                 jwt, password, ApiError, asyncHandler
  app.ts                 Express app factory
  index.ts               server bootstrap
prisma/schema.prisma     full domain schema
```

## Notes

- Refresh tokens are currently stateless (verified by signature only). A
  revocation store (DB/Redis) is a follow-up before production.
- `TimeSlot.availableCapacity` is the source of truth for availability;
  decrement it inside a transaction on booking confirm (Phase 3).
