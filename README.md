# Excursi

An experiences & activities booking platform — travelers book tours and local
experiences, operators create and manage them, and admins verify operators and
oversee the platform.

## Documentation

- **[Architecture & Workflow](./ARCHITECTURE.md)** — system architecture, user
  flows, API endpoints, folder structure, development phases, and key decisions.

## Stack

- **Frontend:** Next.js (App Router)
- **Backend:** Node.js + Express (REST, JWT auth)
- **Database:** PostgreSQL via Prisma ORM
- **Payments:** Razorpay (INR), Stripe (optional, international)
- **Storage:** S3 / Cloudinary
