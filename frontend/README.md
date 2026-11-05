# XPECTO Frontend (IIT Mandi TechFest)

React 18 + Vite + React Router 6 + Tailwind + Framer Motion. Built against `API_CONTRACT.md` (v1); works with mock data until the Rust backend exists.

## Setup
```bash
npm install
cp .env.example .env     # already present after unzip
npm run dev              # http://localhost:5173
npm run build && npm run preview
```

## Environment variables
| Var | Meaning |
|---|---|
| `VITE_USE_MOCK` | `true` = in-memory data from `src/mock/*.json`, no network. `false` = real server. |
| `VITE_API_URL` | Backend base URL, e.g. `http://127.0.0.1:3000`. Routes live under `/api`. |

Restart `npm run dev` after editing `.env`.

## Mock mode quick tour
- Log in with **any** email/password. `b25347@students.iitmandi.ac.in` becomes admin and shows the Admin link.
- Transaction ID `DUPLICATE123` always returns 409 `DUPLICATE_TRANSACTION`. Registering twice for the same event returns `ALREADY_REGISTERED`.
- Data resets on reload (login persists via localStorage).

## Switching to the real backend
1. Set `VITE_USE_MOCK=false` and `VITE_API_URL=<backend URL>`.
2. Backend must allow CORS for the frontend origin **with credentials** and use an httpOnly session cookie (`SameSite=None; Secure` if the origins are on different sites).
3. All network code is in `src/api.js`; nothing else calls axios/fetch.
4. Uploaded image URLs may be relative (`/static/uploads/a.jpg`); `api.js` prefixes them with `VITE_API_URL` on read and strips on write.
5. Open point: the contract says both `/api/paymentinfo` and `/api/payment-info`. The frontend uses `/api/payment-info` (one line in `api.js`).
6. `teamMembers` is sent as a JSON string of `[{ "name": "..." }]`. Agree on this shape with the backend.

## Optional Express mock server
```bash
npm run mock-server      # http://127.0.0.1:3000, in-memory, implements the full contract
```
Set `VITE_USE_MOCK=false`, `VITE_API_URL=http://127.0.0.1:3000`. Dev only; CORS is limited to `http://localhost:5173`.

## Replacing assets
- **Intro + site background image:** replace `src/assets/hands.jpg` (landscape, ~1080x732 or larger, human hand on the left, robot hand on the right, fingertips meeting at the horizontal centre, about 41% from the top). The intro splits this one photo into two halves that slide together; the same file is the dimmed site-wide background (`.site-bg` in `animations.css`).
- **Team photos:** upload via Admin > Team (stored by the server), or set `photoUrl` in `src/mock/team.json` (use files in `public/`, e.g. `/team/asha.jpg`).
- **Hero / event / sponsor images:** Admin tabs, or the matching `src/mock/*.json` in mock mode.

## Redesign layer
`src/styles/redesign.css` (loaded last) holds the immersive look: floating HUD header (`Navbar.jsx`), side dock (`SideDock.jsx`, screens >= 1400px), framed panels, section titles and the layered cinematic background (`ParallaxBackground.jsx`).

## Page composition
Hero, stats, About text, sponsor names, contact and team portraits sit directly on the scene; important items (events, workshops, highlights, auth, sponsor titles) use the gold frame (`src/assets/frame.webp`, cut from the supplied reference) for events/auth; workshops, sponsors and highlights are open, box-free layouts. Plain boxed panels remain only in the admin area.

## Structure
`src/api.js` (only network layer) · `context/AuthContext.jsx` · `routes.jsx` (lazy routes, guards) · `components/` (shared UI) · `pages/` (public + `admin/`) · `hooks/` · `mock/` · `styles/` · `mock-server/`.

## Notes
- The admin UI is hidden for non-admins, but **security is the backend's job**. 401 redirects to login, 403 to home.
- Intro (hands meet, light burst, "XPECTO'YY" pop; the year comes from `Fest.startDate`) plays once per session (`sessionStorage` key `xpecto_intro_seen`); Skip button included.
- Performance: ambient canvas is capped at 30fps and pauses in hidden tabs, fewer particles on phones, vendor code split into `react` / `motion` chunks, routes and images lazy-loaded.
- Depth effects: `ParallaxBackground` (photo / grid / glow orbs at different scroll speeds, one rAF-throttled listener, transforms only), scroll-in reveal with stagger (`RevealObserver`), animated counters (`CountUp`), route-change sweep line. Speeds are the `0.1`, `0.16`, `0.4` factors in `ParallaxBackground.jsx`.
- Cards tilt toward the mouse with a moving glare (`components/TiltObserver.jsx`, one delegated listener; mouse only, off for touch and reduced motion). Add `tilt-card` to any element to opt in; tune strength via `MAX` in that file.
- Animations respect `prefers-reduced-motion`. Routes and images are lazy-loaded.
