# API Reference — XPECTO'27 Backend

**Base URL:** `http://localhost:3000` (configurable via `PORT`/`HOST`)  
**API prefix:** `/api`  
**Auth:** JWT in HttpOnly, SameSite=Lax cookie `xpecto_token`  
**CORS:** `http://localhost:5173` (configurable via `CORS_ORIGIN`), credentials enabled

All JSON request/response bodies use camelCase field names matching the frontend.

---

## Authentication

### POST `/api/auth/signup`
Register a new user. Sets the session cookie on success.

**Request body**
```json
{
  "name": "string (min 2)",
  "email": "string (valid email)",
  "password": "string (min 8)",
  "phone": "string (10-15 digits)",
  "college": "string"
}
```

**Response (201)**
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "phone": "string",
    "college": "string",
    "role": "user" | "admin"
  }
}
```

**Errors**
- `422 VALIDATION` — validation failure or email already registered
- `500 SERVER` — internal error

### POST `/api/auth/login`
Authenticate user. Sets the session cookie on success.

**Request body**
```json
{ "email": "string", "password": "string" }
```

**Response (200)**
```json
{ "user": { "id", "name", "email", "phone", "college", "role" } }
```

**Errors**
- `401 UNAUTHENTICATED` — wrong email or password

### POST `/api/auth/logout`
Clears the session cookie.

**Response (200)**
```json
{ "ok": true }
```

### GET `/api/auth/me`
Returns the currently authenticated user (from cookie). Requires valid session.

**Response (200)**
```json
{ "user": { "id", "name", "email", "phone", "college", "role" } }
```

**Errors**
- `401 UNAUTHENTICATED` — no valid session

---

## Public Content

### GET `/api/fest`
Fest information (single document).

**Response**
```json
{
  "id": "string",
  "name": "string",
  "tagline": "string",
  "startDate": "ISO string",
  "endDate": "ISO string",
  "venue": "string",
  "aboutHtml": "string",
  "heroImageUrl": "string",
  "contactEmail": "string",
  "contactPhone": "string"
}
```

### GET `/api/events`
List of all events.

**Response** — array of event objects:
```json
{
  "id": "string",
  "slug": "string",
  "name": "string",
  "category": "string",
  "description": "string",
  "rules": "string",
  "imageUrl": "string",
  "startTime": "ISO string",
  "endTime": "ISO string",
  "venue": "string",
  "prizePool": 0,
  "prizeBreakdown": [{ "position": "string", "amount": 0 }],
  "registrationFee": 0,
  "teamSize": { "min": 1, "max": 1 },
  "registrationOpen": true,
  "contact": { "name": "string", "phone": "string" }
}
```

### GET `/api/events/:id`
Single event by MongoDB ObjectId (hex string).

### GET `/api/workshops`
List of workshops sorted by start time.

**Response** — array:
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "imageUrl": "string",
  "speaker": "string",
  "startTime": "ISO string",
  "endTime": "ISO string",
  "venue": "string",
  "fee": 0,
  "seatsTotal": 0,
  "seatsLeft": 0
}
```

### GET `/api/team`
Team members sorted by `order`.

**Response** — array:
```json
{
  "id": "string",
  "name": "string",
  "role": "string",
  "department": "string",
  "photoUrl": "string",
  "email": "string",
  "linkedinUrl": "string",
  "order": 0
}
```

### GET `/api/sponsors`
List of sponsors.

**Response** — array:
```json
{
  "id": "string",
  "name": "string",
  "tier": "string",
  "logoUrl": "string",
  "websiteUrl": "string"
}
```

### GET `/api/messoptions`
List of mess options. Note: path has **no hyphen**.

**Response** — array:
```json
{
  "id": "string",        // string id (e.g. "pine", "oak", "alder")
  "name": "string",
  "description": "string",
  "price": 0,
  "imageUrl": "string"
}
```

### GET `/api/payment-info`
Payment details.

**Response**
```json
{ "qrImageUrl": "string", "upiId": "string", "note": "string" }
```

---

## Registrations (auth required)

### POST `/api/registrations`
Register for an event or workshop. Multipart form data.

**Form fields**
| Field | Type | Description |
|-------|------|-------------|
| `kind` | string | `"event"` or `"workshop"` |
| `targetId` | string | ObjectId of the event/workshop |
| `transactionId` | string | unique transaction id (user-provided) |
| `screenshot` | file | image ≤ 5 MB (png/jpeg/webp) |
| `teamName` | string | optional team name |
| `teamMembers` | string | JSON array of `{ name }` |

**Response (201)**
```json
{ "registration": { "id", "kind", "targetId", "targetName", "transactionId", "screenshotUrl", "status", "amount", "teamName", "teamMembers", "createdAt", "user" } }
```

**Errors**
- `409 DUPLICATE_TRANSACTION` — transaction id already used
- `409 ALREADY_REGISTERED` — already registered for this target
- `400 VALIDATION` — missing/invalid fields
- `404 NOT_FOUND` — target not found / registration closed / sold out

### GET `/api/registrations/me`
Current user's registrations.

**Response**
```json
{ "registrations": [ { ...registration... } ] }
```

### POST `/api/mess/registrations`
Register for a mess option. Multipart form data.

**Form fields**
| Field | Type | Description |
|-------|------|-------------|
| `messOption` | string | ObjectId of mess option |
| `transactionId` | string | unique transaction id |
| `screenshot` | file | image ≤ 5 MB |

### GET `/api/mess/registrations/me`
Current user's mess registrations.

---

## Administration (admin role required)

### Content CRUD

| Resource | Create | Update | Delete |
|----------|--------|--------|--------|
| Fest | — | `PUT /api/admin/fest` | — |
| Payment info | — | `PUT /api/admin/payment-info` | — |
| Events | `POST /api/admin/events` | `PUT /api/admin/events/:id` | `DELETE .../:id` |
| Workshops | `POST /api/admin/workshops` | `PUT .../:id` | `DELETE .../:id` |
| Team | `POST /api/admin/team` | `PUT .../:id` | `DELETE .../:id` |
| Sponsors | `POST /api/admin/sponsors` | `PUT .../:id` | `DELETE .../:id` |
| Mess options | — | `PUT /api/admin/mess-options/:id` | — |

Create/update bodies use the same field shape as the public models (camelCase). Mess options use string `_id`.

### File upload
**POST `/api/admin/uploads`** — multipart `file`. Returns `{ "url": "/uploads/<file>" }`. Max 5 MB, image only.

### Registration review
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/registrations` | query: `kind`, `targetId`, `status` |
| POST | `/api/admin/registrations/:id/approve` | Approve registration |
| POST | `/api/admin/registrations/:id/reject` | body `{ reason }` |
| GET | `/api/admin/mess/registrations` | query: `messOption`, `status` |
| POST | `/api/admin/mess/registrations/:id/approve` | Approve mess registration |
| POST | `/api/admin/mess/registrations/:id/reject` | body `{ reason }` |
| GET | `/api/admin/registrations/export.csv` | Download CSV |

### Admin email management
| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/admin/admins` | — | List admin emails |
| POST | `/api/admin/admins` | `{ email }` | Add admin (syncs user role) |
| DELETE | `/api/admin/admins/:email` | — | Remove admin |

---

## Health

### GET `/health`
Returns `ok` with 200 when the server is running and MongoDB is reachable.

---

## Error Format

All errors return JSON:
```json
{
  "error": {
    "code": "VALIDATION",
    "message": "Human readable message"
  }
}
```

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION` | 422 | Bad input / business rule |
| `UNAUTHENTICATED` | 401 | Missing or invalid session |
| `FORBIDDEN` | 403 | Not an admin |
| `NOT_FOUND` | 404 | Resource missing |
| `CONFLICT` | 409 | Duplicate transaction or registration |
| `FILE_TOO_LARGE` | 413 | Upload > 5 MB |
| `SERVER` | 500 | Internal error |

---
