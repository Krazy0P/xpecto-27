# Backend Architecture — XPECTO'27

**Stack:** Rust, Axum, Tokio, Serde, MongoDB official driver, JWT, Argon2, Tower HTTP  
**Database:** MongoDB (`xpecto`)  
**Location:** `backend/`

---

## Design Principles

1. **Strict separation of concerns** — routes, handlers, services, models, database, middleware, errors each live in their own module.
2. **No logic in `main.rs`** — `main.rs` only wires config, DB, router, and server.
3. **Frontend-first API contracts** — every endpoint mirrors the exact path/shape the existing React `api.js` expects (mounted at `/api`, no `/v1`).
4. **Zero frontend changes** — integration via `VITE_API_URL` + `VITE_USE_MOCK=false` only.
5. **Defensive validation** — server-side validation and unique indexes; never trust the client.

---

## Directory Layout

```
backend/
├── Cargo.toml          # dependencies
├── .env.example        # env template
├── src/
│   ├── main.rs         # app entry: tracing, config, DB connect, seed, router, serve
│   ├── config.rs       # env parsing (MONGODB_URI, JWT_SECRET, CORS_ORIGIN, …)
│   ├── database.rs     # MongoClient, connect, ensure indexes, health ping
│   ├── errors.rs       # AppError enum + IntoResponse/Display
│   ├── middleware/
│   │   ├── mod.rs      # AppState (+ FromRef<AppDatabase>)
│   │   ├── auth.rs     # cookie JWT decode → load user → CurrentUser extensions
│   │   └── admin.rs    # admin role guard helper
│   ├── models/         # BSON/JSON data structures (camelCase serialized)
│   │   ├── user.rs
│   │   ├── event.rs
│   │   ├── workshop.rs
│   │   ├── team.rs
│   │   ├── sponsor.rs
│   │   ├── mess.rs
│   │   ├── fest.rs
│   │   ├── payment.rs
│   │   ├── registration.rs
│   │   └── admin.rs
│   ├── routes/         # Axum routing mounted at /api
│   │   ├── mod.rs
│   │   ├── auth.rs
│   │   ├── public.rs
│   │   ├── registrations.rs
│   │   ├── mess.rs
│   │   └── admin.rs
│   ├── handlers/       # HTTP request/response processing
│   │   ├── mod.rs
│   │   ├── auth_handler.rs
│   │   ├── public_handler.rs
│   │   ├── registration_handler.rs
│   │   ├── upload_handler.rs
│   │   └── admin_handler.rs
│   ├── services/       # business logic
│   │   ├── mod.rs
│   │   ├── auth_service.rs   # argon2 + JWT + cookie helpers
│   │   ├── public_service.rs # public reads + admin content CRUD
│   │   ├── registration_service.rs # atomic duplicate prevention
│   │   └── upload_service.rs # file validation/storage
│   └── seed.rs         # idempotent seeding from seed-data/*.json
├── seed-data/          # copies of frontend mock JSON (fest, events, …)
└── uploads/            # uploaded screenshots (created at runtime)
```

---

## Data Flow

```
Client (React + Axios, withCredentials)
    │ HTTP/JSON + Cookie: xpecto_token
    ▼
Axum Router (/api/*)
    │
    ├─ CORS layer (origin, credentials, methods, headers)
    ├─ auth middleware (cookie → JWT → load user → CurrentUser extension)
    └─ Route handler
            │
            ├─ Service (business logic)
            │     └─ Database (MongoDB collections)
            └─ Response (JSON / file / CSV)
```

### Authentication flow
1. `POST /api/auth/signup` or `/api/auth/login` validates credentials, hashes password with Argon2, issues a JWT (`sub` = user id, `role`, `exp`, `iat`).
2. JWT is set as `Set-Cookie: xpecto_token=<jwt>; HttpOnly; Path=/; SameSite=Lax; Max-Age=<exp>`.
3. Every subsequent request sends the cookie automatically (Axios `withCredentials: true`).
4. `auth_middleware` decodes the JWT, loads the user from MongoDB, and stores `CurrentUser` in request extensions.
5. `require_auth` / `require_admin` guard protected/admin routes.
6. `POST /api/auth/logout` clears the cookie (`Max-Age=0`).

### Registration flow (duplicate prevention)
1. Client submits multipart form (`kind`, `targetId`, `transactionId`, `screenshot`, …).
2. Server validates target exists/open/seats.
3. `registrations.insert_one` is guarded by two MongoDB **unique indexes**:
   - `{ transaction_id: 1 }` unique → `409 DUPLICATE_TRANSACTION` if reused.
   - `{ user_id: 1, kind: 1, target_id: 1 }` unique (partial, event/workshop) → `409 ALREADY_REGISTERED`.
   - `{ user_id: 1, mess_option: 1 }` unique (partial, mess) → `409 ALREADY_REGISTERED`.
4. On `E11000` duplicate-key error, the server maps the offending field to the appropriate 409 message.

### Admin registration review
1. `GET /api/admin/registrations` lists registrations (joined with user info), filterable by `kind`, `targetId`, `status`.
2. `POST /api/admin/registrations/:id/approve` sets `status=approved` and generates a QR data-URI (`confirmation_qr_url`).
3. `POST /api/admin/registrations/:id/reject {reason}` sets `status=rejected` and stores `rejection_reason`.
4. `GET /api/admin/registrations/export.csv` returns CSV text.

---

## MongoDB Schema (database: `xpecto`)

All documents use `_id` (ObjectId), serialized to clients as string `id`. Mess options keep their original string ids (`"pine"`, `"oak"`, `"alder"`).

### `users`
`{ _id, name, email (unique), phone, college, passwordHash (argon2), role ("user"|"admin"), createdAt, updatedAt }`
- Index: `email` unique

### `events`
`{ _id, slug (unique), name, category, description, rules, imageUrl, startTime, endTime, venue, prizePool, prizeBreakdown[{position, amount}], registrationFee, teamSize{min,max}, registrationOpen, contact{name,phone}, createdAt, updatedAt }`
- Index: `slug` unique; `category`

### `workshops`
`{ _id, title, description, imageUrl, speaker, startTime, endTime, venue, fee, seatsTotal, seatsLeft, createdAt, updatedAt }`

### `team_members`
`{ _id, name, role, department, photoUrl, email, linkedinUrl, order, createdAt, updatedAt }`
- Index: `order`

### `sponsors`
`{ _id, name, tier, logoUrl, websiteUrl, createdAt, updatedAt }`
- Index: `tier`

### `mess_options`
`{ _id (string), name, description, price, imageUrl, createdAt, updatedAt }`

### `fest_info` (single doc)
`{ _id, name, tagline, startDate, endDate, venue, aboutHtml, heroImageUrl, contactEmail, contactPhone }`

### `payment_info` (single doc)
`{ _id, qrImageUrl, upiId, note }`

### `admins`
`{ _id, email (unique), createdAt }` — source of truth for admin status; synced to `users.role` on add/remove.
- Index: `email` unique

### `registrations` (single collection, `kind` discriminator)
`{ _id, kind ("event"|"workshop"|"mess"), userId → users, targetId → events/workshops, targetName, messOption → mess_options, messName, transactionId (unique), screenshotUrl, status ("pending"|"approved"|"rejected"), amount, teamName, teamMembers[{name}], rejectionReason, confirmationQrUrl, createdAt, updatedAt }`
- Index: `transaction_id` unique (global across all registrations)
- Partial unique: `{user_id, kind, target_id}` where kind in [event, workshop]
- Partial unique: `{user_id, mess_option}` where kind = "mess"
- Indexes: `status`, `user_id`, `created_at`

---

## Configuration (`backend/.env.example`)

```
MONGODB_URI=mongodb://localhost:27017
DB_NAME=xpecto
PORT=3000
HOST=0.0.0.0
JWT_SECRET=change-me-in-production
JWT_EXPIRES=24h
CORS_ORIGIN=http://localhost:5173
SEED_ON_START=true
UPLOAD_DIR=backend/uploads
```

**Frontend `.env`**
```
VITE_API_URL=http://localhost:3000
VITE_USE_MOCK=false
```

---

## Running

```bash
# 1. Start MongoDB (mongodb://localhost:27017)
# 2. Backend
cd backend
cp .env.example .env   # edit JWT_SECRET for production
cargo run              # listens on :3000, seeds if collections empty
# 3. Frontend
cd frontend
npm run dev            # Vite on :5173, real-mode via VITE_API_URL
# 4. Verify
curl http://localhost:3000/health   # → ok
```

---

## Testing Checklist

- [ ] `GET /health` → ok (MongoDB reachable)
- [ ] `POST /api/auth/signup` → creates user, sets cookie
- [ ] `POST /api/auth/login` with wrong password → 401
- [ ] `GET /api/auth/me` with cookie → user; without → 401
- [ ] `POST /api/auth/logout` → clears cookie
- [ ] `GET /api/events`, `/api/workshops`, `/api/team`, `/api/sponsors`, `/api/messoptions`, `/api/fest`, `/api/payment-info` → seeded data
- [ ] `POST /api/registrations` → 201; same user+target again → 409 ALREADY_REGISTERED; reused transactionId → 409 DUPLICATE_TRANSACTION
- [ ] `GET /api/registrations/me` → user's registrations
- [ ] `POST /api/mess/registrations` → 201
- [ ] Protected endpoints without cookie → 401; non-admin on admin endpoints → 403
- [ ] Admin CRUD create/update/delete events/workshops/team/sponsors; update fest/payment/mess-option
- [ ] `POST /api/admin/uploads` → `{url}`; file > 5 MB → 413
- [ ] Admin approve/reject registration → status changes; CSV export returns text/csv
- [ ] Admin add/remove admin email → role sync
- [ ] Frontend build (`npm run build`) passes; site navigates end-to-end
