# Frontend Audit — XPECTO'27 Techfest Website

**Project:** Techfest Website — Backend Development and Integration  
**Audited directory:** `frontend/`  
**Status:** Complete — backend implementation integrated  

This document records the complete frontend architecture discovered during Phase 1 (Frontend Audit) and how each part maps to the Rust/Axum + MongoDB backend.

---

## 1. Technology Stack (Frontend)

| Layer | Tech |
|-------|------|
| UI framework | React 19 |
| Build tool | Vite |
| Styling | Tailwind CSS v4 + custom CSS (anime.css, animations.css, redesign.css, neura.css, spacetime.css) |
| Routing | React Router v7 (`BrowserRouter`) |
| HTTP client | Axios (`api.js`) |
| Animations | Motion (Framer Motion), Three.js |
| Forms | Uncontrolled inputs + manual validation |
| State | React context (`AuthContext`) + local state |

The frontend is **already complete** and was NOT recreated. The backend was built to serve the exact API contract the frontend already expects.

---

## 2. Routes and Pages

All routes are defined in `frontend/src/routes.jsx` and mounted under `BrowserRouter` in `main.jsx`.

| Route | Page | Purpose | Auth required |
|-------|------|---------|---------------|
| `/` | About | Hero, fest countdown, highlights, stats, tiered sponsors, contact | No |
| `/about` | About | Same as `/` | No |
| `/events` | Events | Grid of `EventCard`s with category filter chips | No |
| `/events/:id` | EventDetail | Event image, name, category, time, venue, team size, fee, register button, about/rules/prizes/contact | No (register button requires auth) |
| `/workshops` | Workshops | Grid of `WorkshopCard`s sorted by start time, seats-left indicator | No (register requires auth) |
| `/mess` | Mess | Mess option selection + user's mess registrations with QR download | No (register requires auth) |
| `/sponsors` | Sponsors | Tiered sponsors: Title / Gold / Diamond / Silver / Partner | No |
| `/team` | Team | Team members grouped by role (Convenor, Co-Convenor, Team Head, Member) | No |
| `/auth` | Auth | Login/signup toggle form | Redirects to `/me` if logged in |
| `/me` | My Registrations | User's event/workshop/mess registrations with status badges | Yes (ProtectedRoute) |
| `/admin/*` | Admin | Admin panel with CRUD tabs | Yes + admin role (AdminRoute) |

**Navigation** (`GlitchNav.jsx`): Desktop links scramble on hover; mobile drawer. Dynamic links:
- Logged-out: "Login" → `/auth`
- Logged-in: "My Registrations" → `/me`
- Admin: "Admin" → `/admin`

---

## 3. Components

### Layout
- `Navbar.jsx` / `GlitchNav.jsx` — main navigation with glitch text logo "XPECTO'27", mobile drawer, logout button.
- `Footer.jsx` — copyright + 3D model attribution.

### Presentational (design preserved — NOT modified)
- `EventCard.jsx` — event summary card (image, name, category, date, venue, team size, fee, "Register" button).
- `WorkshopCard.jsx` — workshop summary card.
- `MessList.jsx` — mess option cards with registration state.
- `StatusBadge.jsx` — colored badge for registration status (`pending`, `approved`, `rejected`).
- `ErrorState.jsx` — "Signal lost" error UI with optional retry button.
- `Loader.jsx` — three-dot loading spinner.
- `Countdown.jsx` — live countdown to an ISO date.
- `CountUp.jsx` — animated counter on intersection.
- `GlitchText.jsx` — glitch-effect text.
- `GlitchNavLink.jsx` — character-scramble hover link.
- `MangaPanel.jsx`, `TiltObserver.jsx`, `ParticleBackground.jsx`, `SpaceTimeBg.jsx`, `SpaceTimeIntro.jsx`, `TvStaticTransition.jsx`, `NeuraScene.jsx`, `RevealObserver.jsx` — visual effects (preserved).

### Admin components
- `Admin.jsx` — tabbed admin panel (fest/events/workshops/team/sponsors/mess/payment/regs/messregs/admins).
- `CrudTab.jsx` — generic list + create/edit/delete driven by field schema.
- `SingleForm.jsx` — single-document edit form (fest, payment).
- `RegTable.jsx` — registrations review table with approve/reject + CSV export.
- `AdminsTab.jsx` — manage admin emails.
- `FormFields.jsx` — renders form inputs based on schema.
- `ImageUpload.jsx` — image upload field.
- `AdminRoute.jsx`, `ProtectedRoute.jsx` — route guards.

### Hooks
- `AuthContext.jsx` — auth state (`user`, `isAdmin`, `login`, `signup`, `logout`, `me`).
- `useRegisterFlow.js` — registration modal flow with redirect-after-login.
- `useAsync.js` — mount/deps async runner with `{data, error, loading, reload}`.

---

## 4. Forms and Input Fields

### Auth form (`/auth`)
| Field | Type | Validation |
|-------|------|------------|
| name | text | required, min 2 |
| email | email | required, valid email |
| password | password | required, min 8 |
| phone | tel | required, 10–15 digits |
| college | text | required |

Signup/Login toggle.

### Event registration (from EventDetail / workshop card)
Multipart form submitted via `POST /api/registrations`:
- `kind` — "event" or "workshop"
- `targetId` — ObjectId string
- `transactionId` — string (unique, user-provided)
- `screenshot` — file (image, ≤5 MB)
- `teamName` — string
- `teamMembers` — JSON array of `{name}`

### Mess registration
Multipart form via `POST /api/mess/registrations`:
- `messOption` — ObjectId string
- `transactionId` — string
- `screenshot` — file (image, ≤5 MB)

### Admin CRUD forms (driven by `FormFields.jsx`)
| Resource | Fields |
|----------|--------|
| Fest | name, tagline, startDate, endDate, venue, aboutHtml, heroImageUrl, contactEmail, contactPhone |
| Event | name, category, description, rules, imageUrl, startTime, endTime, venue, prizePool, prizeBreakdown, registrationFee, teamSize.min/max, registrationOpen, contact.name/phone |
| Workshop | title, description, imageUrl, speaker, startTime, endTime, venue, fee, seatsTotal, seatsLeft |
| Team | name, role, department, photoUrl, email, linkedinUrl, order |
| Sponsor | name, tier, logoUrl, websiteUrl |
| Mess option | name, description, price, imageUrl |
| Payment | qrImageUrl, upiId, note |

---

## 5. Interactive Features

| Feature | Behavior |
|---------|----------|
| Glitch nav hover | Character scramble on desktop links |
| Mobile drawer | Slide-in on hamburger; closes on route change / Escape |
| Countdown | Live timer to fest start date |
| CountUp | Animated stats counters on scroll into view |
| Event registration | Opens `/me`-gated modal; submits multipart form |
| Workshop registration | Same, with seats-left check |
| Mess registration | Selects option, uploads screenshot, downloads QR after approval |
| Admin CRUD | Add/edit/delete content via generic tabs |
| Registration review | Approve/reject with reason; status badge updates |
| CSV export | Download registrations as CSV |
| Admin email mgmt | Add/remove admin emails (role sync) |
| Auth | Login/signup set HttpOnly cookie; logout clears it |

---

## 6. Data Models (from `frontend/src/mock/*.json` + `api.js` normalizers)

### fest (single document)
`{ name, tagline, startDate, endDate, venue, aboutHtml, heroImageUrl, contactEmail, contactPhone }`

### event
`{ id, slug, name, category, description, rules, imageUrl, startTime, endTime, venue, prizePool, prizeBreakdown[{position, amount}], registrationFee, teamSize{min,max}, registrationOpen, contact{name, phone} }`

### workshop
`{ id, title, description, imageUrl, speaker, startTime, endTime, venue, fee, seatsTotal, seatsLeft }`

### team member
`{ id, name, role, department, photoUrl, email, linkedinUrl, order }`

### sponsor
`{ id, name, tier, logoUrl, websiteUrl }`

### mess option
`{ id, name, description, price, imageUrl }` (string ids like "pine", "oak", "alder")

### payment info
`{ qrImageUrl, upiId, note }`

### user
`{ id, name, email, phone, college, role }` (role: "user" \| "admin")

### registration (event/workshop/mess)
`{ id, kind, targetId, targetName, transactionId, screenshotUrl, status, amount, createdAt, teamName, teamMembers[{name}], user }`

### mess registration
`{ id, messOption, messName, transactionId, screenshotUrl, status, amount, createdAt, confirmationQrUrl, user }`

### admin list
Array of admin email strings (source of truth for admin status).

---

## 7. API Contract (frontend real mode)

The frontend's `api.js` already supports both mock and real modes via `VITE_USE_MOCK`/`VITE_API_URL`. All paths below are the **real-mode** paths the backend must serve exactly (mounted at `/api`, no `/v1` prefix).

### Auth
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | `{name, email, password, phone, college}` | Register user; sets `xpecto_token` cookie |
| POST | `/api/auth/login` | `{email, password}` | Login; sets cookie |
| POST | `/api/auth/logout` | — | Clears cookie |
| GET | `/api/auth/me` | — | Returns current user |

### Public reads
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/fest` | Fest info object |
| GET | `/api/events` | Event list |
| GET | `/api/events/:id` | Single event |
| GET | `/api/workshops` | Workshop list |
| GET | `/api/team` | Team list (sorted by order) |
| GET | `/api/sponsors` | Sponsor list |
| GET | `/api/messoptions` | Mess option list (note: no hyphen) |
| GET | `/api/payment-info` | `{qrImageUrl, upiId, note}` |

### Registrations (auth required)
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/registrations` | multipart | Register for event/workshop |
| GET | `/api/registrations/me` | — | User's registrations |
| POST | `/api/mess/registrations` | multipart | Register for mess |
| GET | `/api/mess/registrations/me` | — | User's mess registrations |

### Admin (admin required)
| Method | Path | Description |
|--------|------|-------------|
| PUT | `/api/admin/fest` | Update fest info |
| PUT | `/api/admin/payment-info` | Update payment info |
| POST | `/api/admin/events` | Create event |
| PUT | `/api/admin/events/:id` | Update event |
| DELETE | `/api/admin/events/:id` | Delete event |
| POST | `/api/admin/workshops` | Create workshop |
| PUT | `/api/admin/workshops/:id` | Update workshop |
| DELETE | `/api/admin/workshops/:id` | Delete workshop |
| POST | `/api/admin/team` | Create team member |
| PUT | `/api/admin/team/:id` | Update team member |
| DELETE | `/api/admin/team/:id` | Delete team member |
| POST | `/api/admin/sponsors` | Create sponsor |
| PUT | `/api/admin/sponsors/:id` | Update sponsor |
| DELETE | `/api/admin/sponsors/:id` | Delete sponsor |
| PUT | `/api/admin/mess-options/:id` | Update mess option |
| POST | `/api/admin/uploads` | multipart `file` → `{url}` |
| GET | `/api/admin/registrations` | List (query: kind, targetId, status) |
| POST | `/api/admin/registrations/:id/approve` | Approve |
| POST | `/api/admin/registrations/:id/reject` | `{reason}` |
| GET | `/api/admin/mess/registrations` | List mess regs (query: messOption, status) |
| POST | `/api/admin/mess/registrations/:id/approve` | Approve |
| POST | `/api/admin/mess/registrations/:id/reject` | `{reason}` |
| GET | `/api/admin/registrations/export.csv` | CSV export |
| GET | `/api/admin/admins` | List admin emails |
| POST | `/api/admin/admins` | `{email}` |
| DELETE | `/api/admin/admins/:email` | Remove admin |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Returns "ok" |

---

## 8. Frontend–Backend Integration

The frontend required **zero source-code changes**. Integration is achieved entirely through environment variables:

**`frontend/.env`**
```
VITE_API_URL=http://localhost:3000
VITE_USE_MOCK=false
```

How it works:
1. `api.js` reads `VITE_USE_MOCK`. When not `"false"`, it uses mock data from `src/mock/`.
2. Setting `VITE_USE_MOCK=false` switches all reads/writes to real HTTP via Axios to `VITE_API_URL`.
3. The Axios instance uses `withCredentials: true`, so the `xpecto_token` HttpOnly cookie is sent automatically on every request.
4. The response interceptor prefixes relative asset URLs (starting with `/`) with `VITE_API_URL`. Uploaded files are returned as relative paths (e.g. `/uploads/<file>`) so they resolve correctly.
5. `AuthContext` calls `api.me()` on mount; a 401 clears the user. `ProtectedRoute`/`AdminRoute` guard `/me` and `/admin`.

**No frontend files were modified** — design, styling, animations, layouts, and components are fully preserved.

---

## 9. Features Requiring Database Persistence

- User accounts (auth, role)
- Fest info, events, workshops, team, sponsors, mess options, payment info (admin-managed content)
- Event/workshop/mess registrations (with duplicate prevention)
- Registration approval/rejection workflow
- Admin email list
- Uploaded screenshots (stored under `backend/uploads/`)

---

## 10. Integration Challenges & Resolutions

| Challenge | Resolution |
|-----------|------------|
| Frontend expects `/api` (not `/api/v1`) | Backend mounts all routes at `/api` |
| `messoptions` endpoint has no hyphen | Route `/api/messoptions` matches exactly |
| Mess options use string ids ("pine", "oak", "alder") | `_id` stored as string for mess_options |
| `withCredentials` + cookie auth | JWT in HttpOnly SameSite=Lax cookie; CORS allows credentials |
| Asset URLs must be relative | Uploads return `/uploads/<file>`; frontend interceptor prefixes base |
| Duplicate registration across concurrent requests | MongoDB unique indexes on `transaction_id` and `(user_id,kind,target_id)` |
| Admin list is source of truth for role | `admins` collection + `users.role` kept in sync |
| Mess QR code | SVG data-URI placeholder generated on approve |

---
