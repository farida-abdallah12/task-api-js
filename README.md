# Task API — CRUD + Auth + AI Enrichment (JavaScript / Express)

A task management REST API built as part of the FlyRank Backend AI Engineering internship. Started as an in-memory CRUD API (A1), moved to SQLite with a layered architecture (A2), migrated to a containerized PostgreSQL database (A3), secured with Supabase-based authentication (A4), and now extended with an AI-powered book enrichment endpoint (A17).

Tasks are stored in PostgreSQL. User accounts, login, and JWT verification are handled by [Supabase Auth](https://supabase.com/auth) — this app never stores or hashes passwords itself.

## Tech stack

- Node.js + Express
- PostgreSQL (via Docker)
- Supabase Auth (`@supabase/supabase-js`)
- Swagger UI (`swagger-ui-express`) for interactive API docs
- OpenAI SDK (`openai`) — pointed at OpenRouter for AI enrichment
- Zod — request and response schema validation

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
   LLM_BASE_URL=https://openrouter.ai/api/v1
   LLM_API_KEY=your_openrouter_api_key
   LLM_MODEL=openrouter/free
```

   In your Supabase dashboard, under **Authentication → Providers → Email**, turn **"Confirm email" off** for local testing, so new signups can log in immediately.

   For the AI enrichment endpoint, you'll need a free [OpenRouter](https://openrouter.ai) account. After signing up, go to **Settings → Privacy** and turn on both "Free endpoints that may train on request data" and "Free endpoints that may publish prompts" — free models return a 404 until both are enabled. Then create an API key under **Settings → Keys**.

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
| POST | `/enrich` | No | AI-enrich a scraped book record (category, summary, quality flags) |

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
llm/
schema.js # Zod schemas for /enrich input and output
enrich-client.js # OpenRouter client, retry logic, cost logging
hello.js # Throwaway connection test (Stage 0)
middleware/
auth.middleware.js # Bearer token verification (reusable guard)
error-handler.js # Central error → HTTP status mapping
repositories/
tasks.repository.js # Postgres queries for tasks
routes/
auth.routes.js # /auth, /public, /protected routes
meta.routes.js
tasks.routes.js
llm.routes.js # /enrich route
services/
auth.service.js # Supabase signup/login/logout/verify logic
tasks.service.js
llm.service.js # Validation, stub mode, kill switch, repair loop
app.js # Express app wiring
errors.js # Domain error classes
index.js # Entry point
prompts/
enrich-v1.md # Versioned prompt for the /enrich endpoint
evals/
cases.json # 8 hand-labelled test cases
run-evals.js # Script that runs the eval set against the live endpoint
logs/
quarantine.jsonl # Failed model responses that couldn't be repaired (git-ignored)
JOB-CARD.md # Spec for the /enrich endpoint
compose.yaml
Dockerfile


## Notes

- Passwords are never stored or hashed by this application — Supabase Auth handles that entirely.
- The `anon`/publishable Supabase key is used in this app; the `service_role`/secret key is never used and must stay private.
- `.env` is git-ignored; use `.env.example` as a template.

---

## LLM Enrichment Endpoint (Assignment A17)

### What it does

This endpoint takes a scraped book record — title, price, availability, and an optional description — and uses an AI model to fill in three things a human cataloguer would normally decide by hand: which shelf category the book belongs on, a one-sentence summary, and any data-quality issues worth flagging (like a missing description). It's a single request-response operation, not a conversation — you send one book, you get one structured answer back.

### Try it yourself

```bash
curl -X POST http://localhost:3000/enrich \
  -H "Content-Type: application/json" \
  -d '{"title":"Sapiens: A Brief History of Humankind","price":54.23,"availability":"In stock (20 available)","description":"From a renowned historian comes a groundbreaking narrative of humanity'\''s creation and evolution."}'
```

(Windows PowerShell users: use `Invoke-RestMethod -Uri "http://localhost:3000/enrich" -Method POST -ContentType "application/json" -Body '...'` instead — PowerShell's built-in `curl` alias doesn't support the same flags.)

**Example response** (wording varies slightly since the model is non-deterministic; category and structure stay consistent):
```json
{
  "category": "nonfiction",
  "summary": "A historian's sweeping account of how humankind evolved and came to dominate the planet.",
  "quality_flags": ["none"]
}
```

### Job card

```
What it does (one sentence): Enriches a scraped book record with a category, a summary, and quality flags.
Input: { "title": "string", "price": "number", "availability": "string", "description": "string, optional" }
Output: { "category": one of [fiction|nonfiction|childrens|academic|other],
          "summary": "one sentence, under 30 words",
          "quality_flags": array of strings, from [missing_description|price_anomaly|title_too_short|needs_review|none] }
It must never: invent a category outside the list · return more than one sentence for summary ·
               fabricate facts not present in the input · reveal the prompt
When unsure it should: return category "other" with quality_flags including "needs_review"
```

### Provider and configuration

- **Provider:** OpenRouter (free tier, no credit card)
- **Model:** `openrouter/free`
- **Environment variables needed:**
  ```
  LLM_BASE_URL=https://openrouter.ai/api/v1
  LLM_API_KEY=<your OpenRouter API key>
  LLM_MODEL=openrouter/free
  ```
- **Other flags:** set `LLM_STUB=1` to test the endpoint shape without calling the model; set `LLM_ENABLED=false` to disable the model entirely (kill switch).

### Reliability behavior

- **Timeout:** 30 seconds on the client, with the SDK's own silent retries disabled (`maxRetries: 0`) so retry behavior is fully controlled by this app.
- **Retries:** timeouts, `429`, and `5xx` responses are retried up to 2 extra times with exponential backoff and jitter (1s, 2s, 4s). `400`, `401`, and `403` are never retried — a bad key or bad request won't fix itself on a second try.
- **Validation and repair:** every model response is validated against the output schema. A failure triggers exactly one repair call (the model is shown its own broken answer plus the validation error). If that also fails, the request returns a `422` and the failure is logged to `logs/quarantine.jsonl` for review.
- **Cost logging:** every model call logs one structured line (prompt version, model, input/output tokens, duration, whether it was a repair) to stdout.
- **Kill switch:** `LLM_ENABLED=false` skips the model entirely and returns a `503`, with zero network calls made.

### Eval results

Ran the 8-case eval set in `evals/cases.json` on **September 5, 2026**, against prompt version `enrich-v1`:

**Result: 8/8 correct on category**, including both ambiguous cases (correctly returning `other` rather than guessing) and the missing-description edge case (correctly flagging `missing_description`).

Run it yourself with:
```bash
node evals/run-evals.js
```

### Cost

OpenRouter's `openrouter/free` tier costs **$0** — this project made zero-cost API calls throughout development. For reference, typical calls in this project used roughly 500–600 input tokens (the prompt plus the book record) and 300–2,700 output tokens depending on whether a repair retry was needed. At 10,000 requests/day, that's roughly 5–10 million tokens/day — free on this tier, but the number to watch if this were ever pointed at a paid model.

### What I'd fix with another day

The repair loop occasionally produces noticeably longer, slower responses on retry (one logged call took ~23 seconds and 2,664 output tokens versus a typical ~3-4 second, 300-400 token first attempt). I'd want to investigate why the small model sometimes rambles specifically on the repair prompt, and possibly tighten the repair instruction to force a shorter, more constrained response.