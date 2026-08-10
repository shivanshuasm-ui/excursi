# excursi-backend

Node.js + Express + Prisma API for Excursi. Phase 0: scaffold, database schema,
and JWT auth.

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
`POST /api/operators/signup` (Phase 1) and admins are seeded.

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
