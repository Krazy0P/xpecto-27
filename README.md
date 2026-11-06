# XPECTO-27 — IIT Mandi Techfest Website

Website for **XPECTO-27**, the annual technical festival of IIT Mandi.

The project consists of a React-based frontend and a Rust-based backend.

## Prerequisites

Make sure the following tools are installed:

- **Git** – Version control
- **Node.js and npm** – Frontend development
- **Rust (stable)** – Backend development
- **Cargo** – Rust package manager (included with Rust)
- **SQLite** – Database

Verify installations:

```bash
git --version
node --version
npm --version
rustc --version
cargo --version
sqlite3 --version
```

## Tech Stack

**Frontend**
- React 18
- Vite
- Tailwind CSS
- React Router
- Axios
- Framer Motion
- Three.js

**Backend**
- Rust
- Axum
- Tera
- SQLite
- SQLx

## Project Structure

```text
xpecto-27/
├── frontend/          # React + Vite frontend
│   ├── src/
│   ├── public/
│   └── package.json
│
├── src/
│   └── main.rs        # Backend routes and handlers
│
├── templates/         # Tera HTML templates
├── static/            # Static backend assets
├── migrations/        # SQLite migrations
├── .env               # Environment configuration
├── Cargo.toml
└── README.md
```

## Getting Started

### 1. Clone the repository

Open VS Code and launch a terminal (`Ctrl + ~`).

```bash
git clone https://github.com/XPECTO-IITMANDI/xpecto-27.git
cd xpecto-27
```

Open the cloned project in VS Code:

```bash
code .
```

### 2. Configure the Backend Environment

In the project root, create a `.env` file:

```bash
cp .env.example .env
```

Set the database URL inside `.env`:

```env
DATABASE_URL=sqlite:blog.db
```

### 3. Run the Frontend and Backend

**Important:** The frontend and backend must run simultaneously in two separate terminals.

#### Terminal 1 — Frontend

1. Open the project in VS Code.
2. Open the first terminal using `Ctrl + ~`.
3. Navigate to the frontend directory:

```bash
cd frontend
```

4. Install dependencies:

```bash
npm install
```

5. Start the frontend development server:

```bash
npm run dev
```

6. Open the local URL displayed in the terminal (usually `http://localhost:5173`).

Keep this terminal running.

#### Terminal 2 — Backend

1. In VS Code, click the `+` icon in the terminal panel to open a **second terminal**.
2. Make sure the second terminal is in the project root (`xpecto-27`), not inside `frontend/`.

If necessary, navigate to the project root:

```bash
cd ..
```

3. Check the backend:

```bash
cargo check
```

4. Start the backend:

```bash
cargo run
```

5. The backend will run at:

`http://127.0.0.1:3000`

Keep this terminal running too.

**Note:** Both terminals must remain open while developing. Use `Ctrl + C` in the respective terminal to stop a server.

## Website Pages

| Route | Description |
|---|---|
| `/` | Home |
| `/competitions` | Competitions and HackNight |
| `/workshops` | Workshop schedules and details |
| `/about` | About the fest, team and sponsors |
| `/posts` | Announcements / Notice Board |

## Development Commands

**Frontend (inside `frontend/`):**

```bash
npm install
npm run dev
npm run build
npm run preview
```

**Backend (from project root):**

```bash
cargo check
cargo run
cargo build
cargo build --release
```

## Notes

- Frontend and backend run separately during development.
- The backend uses Tera templates and SQLite.
- Database migrations run automatically when the backend starts.
- Announcements support creating, viewing, editing, and deleting posts.
- Registration functionality and admin authentication are future improvements.

---

**XPECTO-27 | IIT Mandi**

*Building technology, innovation, and experiences.*
