# excursi-backend

Node.js + Express + Prisma API for Excursi.

- **Phase 0** — scaffold, database schema, JWT auth.
- **Phase 1** — operator signup/profile + Experience / Option / TimeSlot CRUD.
- **Phase 2** — traveler-facing public catalog: search/filter listing, detail
  by slug, categories.

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
