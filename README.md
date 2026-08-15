markdown
# Task API — CRUD + Auth (JavaScript / Express)

A task management REST API built as part of the FlyRank Backend AI Engineering internship. Started as an in-memory CRUD API (A1), moved to SQLite with a layered architecture (A2), migrated to a containerized PostgreSQL database (A3), and now secured with Supabase-based authentication (A4).

Tasks are stored in PostgreSQL. User accounts, login, and JWT verification are handled by [Supabase Auth](https://supabase.com/auth) — this app never stores or hashes passwords itself.

## Tech stack

- Node.js + Express
- PostgreSQL (via Docker)
- Supabase Auth (`@supabase/supabase-js`)
- Swagger UI (`swagger-ui-express`) for interactive API docs

## Setup

1. Clone the repo:
```bash
   git clone https://github.com/farida-abdallah12/task-api-js.git
   cd task-api-js
```

2. Install dependencies:
```bash
   npm install
```

3. Copy the example environment file and fill in your own values:
```bash
   cp .env.example .env
```

   You'll need a free [Supabase](https://supabase.com) project. From your project's **Settings → API**, copy your **Project URL** and **Publishable key** into `.env`:

```dotenv
   DATABASE_URL=postgres://postgres:dev@localhost:5432/tasks
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your_supabase_publishable_key
   PORT=3000
```

   In your Supabase dashboard, under **Authentication → Providers → Email**, turn **"Confirm email" off** for local testing, so new signups can log in immediately.

## Running the app

Start PostgreSQL in Docker:

```bash
docker compose up -d db
```

Then run the app locally:

```bash
npm start
```

You should see:

CRUD API listening on port 3000
Server running and connected to Supabase


The API is now available at `http://localhost:3000`, and interactive docs at `http://localhost:3000/docs`.

## API reference

| Method | Route | Auth required | Description |
|---|---|---|---|
| POST | `/auth/signup` | No | Create a new user account |
| POST | `/auth/login` | No | Authenticate and receive a JWT |
| POST | `/auth/logout` | Yes (Bearer token) | End the current session |
| GET | `/public/info` | No | Public, unprotected data |
| GET | `/protected/profile` | Yes (Bearer token) | Get the logged-in user's profile |
| GET | `/protected/dashboard` | Yes (Bearer token) | Example second protected route (same guard) |
| GET | `/tasks` | No | List tasks |
| POST | `/tasks` | No | Create a task |
| GET | `/tasks/:id` | No | Get a single task |
| PUT | `/tasks/:id` | No | Update a task |
| DELETE | `/tasks/:id` | No | Delete a task |
| GET | `/stats` | No | Task counts summary |
| POST | `/reset` | No | Reset tasks to seed data |

Protected routes require an `Authorization: Bearer <access_token>` header, using the token returned from `/auth/login`.

## Example request

Sign up:
```bash
curl -i -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Log in:
```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Access a protected route:
```bash
curl -i http://localhost:3000/protected/profile \
  -H "Authorization: Bearer <your_access_token>"
```

## Swagger UI

Interactive docs, including a bearer-token "Authorize" flow, are available at `/docs` once the server is running.

![Swagger UI showing the protected profile route with a successful authorized response](./screenshots/swagger-protected-profile.png)

## Project structure

src/
config/
supabaseClient.js # Supabase client initialization
middleware/
auth.middleware.js # Bearer token verification (reusable guard)
error-handler.js # Central error → HTTP status mapping
repositories/
tasks.repository.js # Postgres queries for tasks
routes/
auth.routes.js # /auth, /public, /protected routes
meta.routes.js
tasks.routes.js
services/
auth.service.js # Supabase signup/login/logout/verify logic
tasks.service.js
app.js # Express app wiring
errors.js # Domain error classes
index.js # Entry point
compose.yaml
Dockerfile


## Notes

- Passwords are never stored or hashed by this application — Supabase Auth handles that entirely.
- The `anon`/publishable Supabase key is used in this app; the `service_role`/secret key is never used and must stay private.
- `.env` is git-ignored; use `.env.example` as a template.