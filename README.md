# EXPECTO-27 — IIT Mandi Techfest Website

Rust + Axum + Tera + SQLite website for **EXPECTO-27**, the annual techfest of IIT Mandi.

Tabs: **Home (`/`) · Competitions (`/competitions`) · Workshops (`/workshops`) · About (`/about`)**,
plus **Announcements (`/posts`)** — the original blog engine, rebranded as the fest notice board.

## 1. Quick start

```bash
# prerequisites: Rust stable, sqlite3
cp .env.example .env   # or check .env -> DATABASE_URL=sqlite:blog.db
cargo run
# open http://127.0.0.1:3000
```

Routes:

| URL | Page | Template |
|---|---|---|
| `/`, `/home` | Home — hero, stats, highlights, dates, sponsors, CTA | `templates/home.html` |
| `/competitions` | 9 competitions + HackNight flagship + registration steps | `templates/competitions.html` |
| `/workshops` | 5 workshops schedule + fees/seats | `templates/workshops.html` |
| `/about` | Story, fest details, team, sponsors, travel | `templates/about.html` |
| `/posts` | Announcements list (paginated) | `templates/posts/list.html` |
| `/posts/new`, `/posts/:id`, `/posts/:id/edit` | Create/read/update/delete announcement | `templates/posts/*.html` |

Shared layout (nav, footer, styles, JS): `templates/base.html`.

## 2. Project structure

```
expecto-27/
├── src/main.rs          # all routes + handlers (fest pages + blog CRUD)
├── templates/
│   ├── base.html        # nav (active_page), footer, Tailwind, scroll-reveal JS
│   ├── home.html        # hero, stats, highlights, dates, updates, sponsors, CTA
│   ├── competitions.html# flagship hackathon, 9 event cards, how-to-register
│   ├── workshops.html   # day-wise schedule cards
│   ├── about.html       # story, details, team, sponsors, travel
│   └── posts/           # announcements CRUD (list/new/show/edit)
├── static/              # static files served at /static (currently empty)
├── migrations/          # sqlx SQLite migrations (posts table)
├── blog.db              # local SQLite DB (git-ignored ideally)
├── .env                 # DATABASE_URL=sqlite:blog.db
└── Cargo.toml
```

## 3. How it works (code tour)

`src/main.rs`:
- `AppState { db: SqlitePool, tera: Tera }` shared via `Arc` (`State<Arc<AppState>>`).
- Fest handlers (`home`, `competitions`, `workshops`, `about`) each insert
  `active_page` into a Tera `Context` and call `render_template()`.
- `base.html` highlights nav with `{% if active_page == 'home' %}active{% endif %}`
  (with `| default(value='')` so blog form pages without the var don't error).
- Blog handlers (`list_posts`, `create_post`, …) are unchanged fest-wise except they
  now set `active_page = "blog"` so the **Announcements** nav item lights up.
  Pagination still uses `page`/`per_page` — deliberately separate from `active_page`.
- `ServeDir::new("static")` serves `/static/*`.

`templates/base.html`:
- Dark theme (`#05060f` body) + Tailwind CDN + Space Grotesk/Inter fonts;
  custom CSS: `.glass-card`, `.gradient-text`, `.card-hover`, `.nav-link`,
  `.floating-orb`, `.pulse-glow`, `.scroll-reveal` + IntersectionObserver JS.
- Dynamic particle background: fixed full-viewport `<canvas id="particles">`
  painted by vanilla JS — ~50-160 randomly drifting/twinkling particles in
  emerald/lime/mint/green/teal, faint connecting lines, cursor repulsion,
  edge wrapping, DPR-aware resize, disabled under `prefers-reduced-motion`.
- Colour scheme: black (`#05060f`) + green (emerald primary, lime secondary;
  red kept only for destructive Delete buttons).
  Page sections are transparent/glass so particles show through everywhere.
- Fixed dark-glass navbar, 4 fest links + Announcements + Register button; dark footer.

## 4. Customising content

- **Dates/fees/prizes/contacts**: edit the HTML files directly (search `February`,
  `₹`, `expecto@iitmandi.ac.in`). No DB needed for fest pages — all static.
- **Team/sponsors**: `about.html` `#team` / `#sponsors` sections.
- **Add a tab** (e.g. `/schedule`): 1) create `templates/schedule.html`
  extending `base.html`, 2) add handler + `.route("/schedule", get(schedule))`
  in `main.rs`, 3) add nav link in `base.html`.
- **Real registrations**: currently Register buttons link to `/posts` (demo).
  Add a `registrations` table + migration, a `POST /register` handler, and a form.

## 5. Dev commands

```bash
cargo check      # fast typecheck
cargo run        # dev server on :3000 (runs migrations automatically)
cargo build --release
```

DB reset: `rm blog.db && cargo run` (migrations re-apply on boot).

## 6. Known limitations / TODO

- Tailwind via CDN (fine for demo; vendor it for offline/production).
- No auth on `/posts/new` — anyone can post announcements. Add admin login before launch.
- Placeholder team names, sponsor logos (text), contact phone.
- `static/` is empty; add `logo.svg`, images, favicon and reference via `/static/...`.
