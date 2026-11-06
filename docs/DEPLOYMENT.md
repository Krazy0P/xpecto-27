# Deployment Guide — XPECTO'27 Backend

**Backend:** Rust/Axum + MongoDB (`xpecto`)  
**Frontend:** React + Vite (unchanged)

---

## Prerequisites

- Rust toolchain (cargo/rustc)
- Node.js + npm (frontend already built)
- MongoDB (v5+) reachable at `MONGODB_URI`

---

## Backend Deployment

### 1. Prepare environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` for your environment:

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` or `mongodb+srv://...` |
| `DB_NAME` | Database name | `xpecto` |
| `PORT` | HTTP listen port | `3000` |
| `HOST` | HTTP listen host | `0.0.0.0` |
| `JWT_SECRET` | Secret for signing JWTs | **change in production** (min 32 random chars) |
| `JWT_EXPIRES` | Session expiry (seconds) | `86400` (24h) |
| `CORS_ORIGIN` | Allowed frontend origin | `https://your-frontend.domain` |
| `SEED_ON_START` | Seed DB on start if empty | `true` |
| `UPLOAD_DIR` | Directory for uploaded files | `backend/uploads` |

**Security notes:**
- Never commit `JWT_SECRET` or `.env` to version control.
- `CORS_ORIGIN` must be a specific origin (not `*`) because credentials are enabled.
- Use HTTPS in production; the `SameSite=Lax` cookie works cross-origin on secure contexts. If behind HTTPS with a different frontend domain, consider `SameSite=None; Secure` (update `set_token_cookie`/`clear_token_cookie` in `src/services/auth_service.rs`).

### 2. Build and run

```bash
cd backend
cargo build --release
cargo run --release
```

The server listens on `HOST:PORT` (default `0.0.0.0:3000`) and seeds MongoDB on first start if `SEED_ON_START=true`.

### 3. Verify

```bash
curl http://<host>:<port>/health   # → ok
curl http://<host>:<port>/api/fest   # → fest JSON
```

---

## Frontend Deployment

The frontend requires no source changes. Build it pointed at the backend:

```bash
cd frontend
# create .env (or use your platform's env vars)
cat > .env <<EOF
VITE_API_URL=https://<backend-domain>
VITE_USE_MOCK=false
EOF
npm run build
```

Serve `frontend/dist/` with any static host (Nginx, Vercel, Netlify, etc.). Ensure the host allows the backend to set/read cookies:
- If frontend and backend are on **different domains**, set `CORS_ORIGIN` to the frontend origin and ensure cookies are sent cross-origin (`withCredentials: true` is already set in `api.js`).
- If the backend sets `SameSite=Lax` (default), cross-site fetch/XHR may not send the cookie in some browsers. For production on separate domains, switch the cookie to `SameSite=None; Secure` and serve both over HTTPS.

---

## Docker (optional)

A minimal Dockerfile for the backend:

```dockerfile
FROM rust:1-bookworm AS builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/xpecto-backend /usr/local/bin/
COPY --from=builder /app/.env ./.env
COPY --from=builder /app/seed-data ./seed-data
EXPOSE 3000
CMD ["xpecto-backend"]
```

Build:
```bash
cd backend
docker build -t xpecto-backend .
docker run -p 3000:3000 --env-file .env xpecto-backend
```

MongoDB must be reachable (e.g. a separate container or managed service). The backend does **not** run MongoDB itself.

---

## Environment Summary

| Service | Default port | Env to configure |
|---------|--------------|------------------|
| Backend | 3000 | `backend/.env` |
| Frontend (dev) | 5173 | `frontend/.env` |
| MongoDB | 27017 | `MONGODB_URI` |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `cargo run` fails to connect | MongoDB not running / wrong URI | Start `mongod`; check `MONGODB_URI` |
| Frontend shows mock data | `VITE_USE_MOCK` not `"false"` | Set `VITE_USE_MOCK=false` |
| 401 on `/api/auth/me` | Cookie not sent / wrong origin | Check `CORS_ORIGIN`, `withCredentials`, HTTPS |
| 409 on registration | Duplicate txn or already registered | Use unique `transactionId`; one registration per user per target |
| Uploads 413 | File > 5 MB | Reduce image size; server limit is 5 MB |
| Admin tab shows empty | Not seeded / wrong role | Seed DB; ensure your email is in `admins` collection |
