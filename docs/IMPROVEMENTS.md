# Detailed Improvements — XPECTO'27

Planned improvements across the backend and frontend. These are **not yet implemented**; they are tracked here for follow-up work.

---

## 1. Backend Improvements

### 1.1 Database & Indexing
- [ ] Add compound index on `registrations({user_id, kind, target_id, status})` to speed up "my registrations" queries filtered by status.
- [ ] Add index on `registrations({created_at, -1})` for recent-registration admin views.
- [ ] Add index on `events({category, startTime})` for filtered event browsing.
- [ ] Add index on `workshops({startTime})` for chronological workshop listing.
- [ ] Consider TTL index on `registrations` for expired pending registrations (optional cleanup).

### 1.2 Authentication & Security
- [ ] **SameSite=None; Secure cookie**: currently `SameSite=Lax`. For production on separate frontend/backend domains, switch `set_token_cookie`/`clear_token_cookie` in `src/services/auth_service.rs` to `SameSite=None; Secure` and serve both over HTTPS.
- [ ] **Refresh token rotation**: implement short-lived access JWT + longer-lived refresh token stored separately, with a `/api/auth/refresh` endpoint.
- [ ] **Password reset flow**: add `/api/auth/forgot-password` and `/api/auth/reset-password` with time-limited reset tokens.
- [ ] **Rate limiting**: add rate limiting on `/api/auth/login`, `/api/auth/signup`, and registration endpoints to prevent brute-force and spam.
- [ ] **Input sanitization**: sanitize HTML in `aboutHtml` and `rules` fields (fest/event) to prevent XSS when rendered by the frontend.
- [ ] **File type validation**: strengthen upload validation beyond MIME (check magic bytes / file headers) to prevent spoofed extensions.
- [ ] **File size limits per endpoint**: enforce stricter limits for avatar/logo uploads vs. registration screenshots.

### 1.3 Registration & Business Logic
- [ ] **Workshop seat decrement**: on successful workshop registration, atomically decrement `seatsLeft`; restore on rejection/cancellation.
- [ ] **Event capacity check**: add `seatsLeft`/capacity to events and enforce it (currently only workshops check seats).
- [ ] **Registration cancellation**: allow users to cancel pending registrations (freeing workshop seats).
- [ ] **Transaction ID validation**: validate transaction ID format and optionally integrate with a payment gateway webhook for automatic verification.
- [ ] **Registration expiry**: auto-reject pending registrations after a configurable timeout (e.g., payment window).
- [ ] **Bulk approve/reject**: allow admin to select multiple registrations and approve/reject in one request.

### 1.4 Admin Features
- [ ] **Admin dashboard stats**: counts of pending/approved/rejected registrations, total revenue, top events.
- [ ] **Admin audit log**: log admin actions (create/update/delete, approve/reject, add/remove admin) with actor, timestamp, and target.
- [ ] **Paginated admin registration list**: currently returns all registrations; add `page`/`limit` query params.
- [ ] **Search/filter registrations**: by user email/college, transaction ID, date range.
- [ ] **Soft delete**: instead of hard-delete for events/workshops/sponsors, add `deletedAt` flag to preserve registration history.

### 1.5 File Handling
- [ ] **Image processing**: resize/compress uploaded images on the server to control storage and bandwidth.
- [ ] **Object storage**: move uploads from local disk to S3/Cloudflare R2 / MinIO for production scaling.
- [ ] **CDN for assets**: serve uploaded images via a CDN domain.

### 1.6 Reliability & Observability
- [ ] **MongoDB transactions**: re-enable multi-document transactions for registration creation (requires replica set) instead of relying only on unique indexes.
- [ ] **Structured logging**: replace `tracing` fmt with JSON logging for production log aggregation.
- [ ] **Health checks**: expand `/health` to include DB latency, collection counts, and version info.
- [ ] **Metrics**: expose Prometheus metrics endpoint (`/metrics`).
- [ ] **Graceful shutdown**: handle SIGTERM to finish in-flight requests before exiting.
- [ ] **Database connection pooling tuning**: configure `maxPoolSize`, `minPoolSize`, `maxIdleTimeMS`.

### 1.7 API & Versioning
- [ ] **API versioning**: add `/api/v1/` prefix alongside `/api` for forward compatibility, with a deprecation plan.
- [ ] **OpenAPI spec**: generate `openapi.yaml` / Swagger docs from the Axum routes (e.g., using `utoipa`).
- [ ] **Standardized error envelope**: ensure all error responses strictly follow `{ error: { code, message } }`.

### 1.8 Campus Ambassador (partially implemented)
- [ ] Ambassador list pagination and filtering by status.
- [ ] Ambassador application file upload (resume/portfolio).
- [ ] Ambassador assignment/reward logic.

---

## 2. Frontend Improvements

### 2.1 Integration & Data Fetching
- [ ] **Centralize loading/error states**: wrap all `api.*` calls with consistent loading spinners and `ErrorState` retry (currently inconsistent across pages).
- [ ] **Optimistic updates**: update UI immediately on registration/submit, roll back on error.
- [ ] **Request deduplication**: prevent duplicate simultaneous submissions (e.g., double-clicking "Register").
- [ ] **Response normalization errors**: handle malformed backend responses gracefully in `norm*` functions (currently assumes well-shaped data).

### 2.2 Forms & Validation
- [ ] **Client-side form validation**: add real-time validation with clear error messages (currently relies mostly on backend 422s).
- [ ] **Form reset after submit**: clear registration forms after successful submission.
- [ ] **File upload preview**: show image preview before submitting registration screenshot.
- [ ] **File size/type client check**: validate image ≤5 MB and type before upload to give instant feedback.

### 2.3 Authentication UX
- [ ] **Remember me / persistent session**: currently session lives only in cookie; add optional "remember me" with longer expiry.
- [ ] **Session expiry warning**: warn user before token expires; auto-refresh in background.
- [ ] **Password strength indicator**: visual feedback on signup password strength.
- [ ] **Login redirect-back**: after login, redirect to the originally intended page (e.g., event detail) instead of always `/me`.

### 2.4 Registration Flow
- [ ] **Registration summary page**: show a confirmation summary before final submit.
- [ ] **Multiple ticket/team member UI**: dynamic add/remove team member fields with validation.
- [ ] **Workshop seats remaining indicator**: live "X seats left" badge with color coding when low.
- [ ] **Registration status timeline**: show pending → approved/rejected with timestamps and admin reason.

### 2.5 Admin Panel
- [ ] **Bulk actions**: select multiple registrations for bulk approve/reject/export.
- [ ] **Admin search bar**: search registrations by name/email/transaction ID.
- [ ] **Admin pagination**: paginate long registration lists instead of loading all.
- [ ] **Undo delete**: brief undo option after deleting an event/workshop/sponsor/team member.
- [ ] **CSV export with filters**: export only filtered registration subset, not all.

### 2.6 UI/UX & Accessibility
- [ ] **Accessibility (a11y)**: add ARIA labels, keyboard navigation, and focus management to modals and admin tabs.
- [ ] **Reduced motion**: respect `prefers-reduced-motion` for the glitch nav and countdown animations.
- [ ] **Dark/light theme toggle**: currently fixed dark spacetime theme; add theme preference.
- [ ] **Empty states**: improve "Nothing here yet" and empty-registration states with actionable CTAs.
- [ ] **Toast notifications**: replace inline alerts with non-blocking toast for success/error (currently uses `react-hot-toast` inconsistently).

### 2.7 Performance
- [ ] **Image lazy loading**: lazy-load event/workshop/sponsor images below the fold.
- [ ] **Code splitting**: route-based lazy loading for `/admin` and `/auth` to reduce initial bundle.
- [ ] **Memoization**: `React.memo` on `EventCard`/`WorkshopCard` lists to prevent unnecessary re-renders.

### 2.8 Campus Ambassador
- [ ] Ambassador application form with file upload.
- [ ] "Apply as Ambassador" link in nav/footer.
- [ ] Ambassador status tracking page for applicants.

### 2.9 Testing & Quality
- [ ] **Unit tests**: Vitest/Jest tests for `norm*` normalizers and form validation.
- [ ] **Integration tests**: Playwright/Cypress for critical flows (register, login, admin approve).
- [ ] **TypeScript**: migrate `api.js`, `util.js`, and page components to TypeScript for type safety.

---

## 3. Cross-Cutting (Both Sides)

- [ ] **API contract testing**: add contract tests that assert backend responses match frontend `norm*` expectations.
- [ ] **Environment documentation**: keep `.env.example` files in sync for both frontend and backend.
- [ ] **CI/CD**: add GitHub Actions to run `cargo build`, `cargo test`, `npm run build`, and lint on every PR.
- [ ] **Documentation**: keep `docs/` (FRONTEND_AUDIT, API, ARCHITECTURE, DEPLOYMENT, IMPROVEMENTS) in sync with code changes.
