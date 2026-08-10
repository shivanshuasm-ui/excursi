# Excursi — Architecture & Workflow

Excursi is an experiences/activities booking platform (think tours, day-trips,
and local experiences). Travelers browse and book experiences; operators create
and manage them; admins verify operators and oversee the platform.

---

## 1. System Architecture

```
CLIENTS
┌──────────────────┬─────────────────────────┬───────────────────┬────────────────────┐
│ Web (Next.js)    │ Web (Next.js)           │ Admin Panel       │ Tablet             │
│ Traveler         │ Operator Panel          │ (Next.js)         │ (responsive)       │
└──────────────────┴─────────────────────────┴───────────────────┴────────────────────┘
                                     │
                                     ▼
              ┌───────────────────────────────────────────────┐
              │  Node.js + Express API Layer                   │
              │  (REST, JWT auth, role-based)                  │
              └───────────────────────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        ▼                            ▼                            ▼
┌────────────────┐        ┌────────────────────┐       ┌──────────────────────┐
│ PostgreSQL     │  ◄──►  │ Razorpay / Stripe  │       │ Cloud Storage        │
│ (Prisma ORM)   │        │ (payments)         │       │ (S3 / Cloudinary)    │
└────────────────┘        └────────────────────┘       └──────────────────────┘
```

### Repositories

| Repo                | Purpose                                                        |
|---------------------|----------------------------------------------------------------|
| `excursi-frontend`  | Next.js App Router (traveler-facing)                           |
| `excursi-operator`  | Operator dashboard (same repo, `/operator` route group)       |
| `excursi-backend`   | Node/Express API + Prisma                                      |
| `excursi-infra`     | Deployment configs, env templates, DB migrations              |

---

## 2. User Flows

### Traveler Flow

```
Landing Page → Search/Browse (filters: destination, date, category, price)
    ↓
Experience Detail Page (gallery, itinerary, inclusions, options list)
    ↓
Select Option → Select Date/Time Slot → Enter Adults/Kids count
    ↓
Review Summary (price breakdown) → Login/Signup (if not logged in)
    ↓
Payment (Razorpay/Stripe) → Booking Confirmation → Email/SMS sent
    ↓
"My Bookings" dashboard (view/cancel upcoming bookings)
```

### Operator Flow

```
Operator Signup → Business Profile Setup (verification pending)
    ↓
Admin approves → Operator Dashboard unlocked
    ↓
Create Experience (title, description, gallery, itinerary, inclusions)
    ↓
Add Options/Packages under Experience (name, price, capacity, duration)
    ↓
Add Time Slots per Option (calendar-based, recurring or one-off)
    ↓
Publish Experience → visible on traveler site
    ↓
Manage Bookings (view incoming, mark completed/cancelled)
    ↓
View Payouts/Earnings summary
```

### Admin Flow

```
Admin Login → Dashboard (platform-wide stats)
    ↓
Operator Verification Queue (approve/reject new operators)
    ↓
Experience Moderation (review before publish, optional for V1)
    ↓
Category Management
    ↓
Bookings Overview (all bookings across operators)
    ↓
Payment/Payout Reconciliation
```

---

## 3. API Endpoints

### Auth

```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/refresh
GET    /api/auth/me
```

### Experiences

```
GET    /api/experiences                 (list + filters)
GET    /api/experiences/:slug           (detail page)
POST   /api/experiences                 (operator only)
PUT    /api/experiences/:id             (operator only)
DELETE /api/experiences/:id             (operator only)
```

### Options & Slots

```
POST   /api/experiences/:id/options
PUT    /api/options/:id
POST   /api/options/:id/slots
GET    /api/options/:id/slots?date=
```

### Bookings

```
POST   /api/bookings
GET    /api/bookings/me
GET    /api/bookings/operator
PATCH  /api/bookings/:id/status
```

### Payments

```
POST   /api/payments/create-order
POST   /api/payments/verify
```

### Operator

```
POST   /api/operators/signup
GET    /api/operators/me
PUT    /api/operators/me
```

### Admin

```
GET    /api/admin/operators/pending
PATCH  /api/admin/operators/:id/verify
GET    /api/admin/bookings
GET    /api/admin/stats
```

---

## 4. Folder Structure

### Frontend (`excursi-frontend`)

```
app/
  (traveler)/
    page.tsx
    search/page.tsx
    experience/[slug]/page.tsx
    checkout/page.tsx
    my-bookings/page.tsx
  (operator)/
    operator/dashboard
    operator/experiences
    operator/experiences/new
    operator/bookings
  (admin)/
    admin/dashboard
    admin/operators
components/
  ui/
  search/
  experience/
  booking/
lib/
  api-client.ts
  auth.ts
```

### Backend (`excursi-backend`)

```
src/
  routes/          (auth, experience, booking, payment, operator, admin)
  controllers/
  services/
  middleware/      (auth, role)
  prisma/
    schema.prisma
    migrations/
  utils/
index.ts
```

---

## 5. Development Phases

| Phase   | Scope                                                | Duration   |
|---------|------------------------------------------------------|------------|
| Phase 0 | Scaffold, DB schema, Prisma, auth (JWT)              | 1 week     |
| Phase 1 | Operator: experience + options + slots CRUD          | 1–1.5 weeks|
| Phase 2 | Traveler: search/browse + detail page (SSR/ISR)      | 1 week     |
| Phase 3 | Booking flow + payment integration                   | 1.5 weeks  |
| Phase 4 | Operator dashboard: bookings, payouts view           | 1 week     |
| Phase 5 | Admin panel: verification, categories, stats         | 1 week     |
| Phase 6 | Polish: responsive/tablet QA, SEO, notifications     | 1 week     |

**Total MVP: ~7–8 weeks**

---

## 6. Key Decisions

- **Auth:** JWT + role-based middleware (traveler / operator / admin).
- **Images:** Cloud storage (S3 / Cloudinary), URLs stored in `gallery` JSONB —
  never binary in DB.
- **Availability:** `time_slots` is the source of truth; decrement
  `available_capacity` on confirm via a DB transaction/row lock. Never overbook.
- **SEO:** ISR (`revalidate`) on experience detail pages.
- **Payments:** Razorpay first (INR); Stripe optional later for international.
- **Build order:** Prisma schema → Auth routes/middleware → Experience CRUD
  (operator side first, then traveler-facing) → Booking + Payment → Dashboards →
  Admin panel.
