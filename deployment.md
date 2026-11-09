# Deployment guide: Brand X Lucknow dealership site

Next.js 15 (App Router) + SQLite (`better-sqlite3`). One process, one database file. No external services are required to run it.

## 1. Run it locally

Requirements: Node.js 22 or newer, npm 10 or newer.

```bash
git clone <GITHUB_URL> brandx-dealer
cd brandx-dealer
npm install
cp .env.example .env          # optional for local dev; see section 3
npm run dev                   # http://localhost:3000
```

The database is created and filled with demo data on first start (`data/dealer.db`). To reset it: `npm run seed`.

Run the tests (27 tests, about 5 seconds, no network):

```bash
npm test
```

Production-style run:

```bash
npm run build
SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" npm start
```

## 2. How it is deployed

The repo has a `Dockerfile`, so it runs on any container host (Render, Railway, Fly.io, a VPS).

Recommended: **Render web service**

1. New Web Service, connect the GitHub repo, runtime **Docker**.
2. Add a **persistent disk** mounted at `/app/data` (1 GB is plenty). SQLite is stored there. Without a disk, data resets on every deploy.
3. Set the environment variables below.
4. Deploy. Health check path: `/`.

Live URL: see the top of the TDD. If it is blank, the app has not been deployed yet and the local steps above are the way to review it.

Scaling note: SQLite and the in-memory rate limiter assume a single instance. Moving to several instances means moving to Postgres and a shared rate-limit store (listed in the TDD under "what I would do next").

## 3. Environment variables (names only)

| Name | Required | Purpose |
|---|---|---|
| `SESSION_SECRET` | **Yes, in production** | Signs staff session cookies. Use 32+ random bytes. The app refuses to start sessions without it in production. |
| `ANTHROPIC_API_KEY` | No | Turns on the Claude-written buyer summary and reply draft. Without it the app uses the rule-based fallback and everything still works. |
| `AI_MODEL` | No | Claude model id for the AI features (default set in code). |
| `DATABASE_PATH` | No | SQLite file location. Default `./data/dealer.db`; the Docker image uses `/app/data/dealer.db`. |
| `SEED_PASSWORD` | No | Password given to the demo staff accounts when the database is first seeded. A default is used if unset. |
| `NEXT_PUBLIC_SITE_URL` | No | Public site URL, used for the sitemap, canonical links and Open Graph tags. |
| `PORT` | No | HTTP port (default 3000). Render sets it for you. |

No secrets are stored in the repository. `.env` is git-ignored; `.env.example` lists names only.

## 4. Demo logins for the reviewer

Staff sign-in is at `/staff/login`. All demo accounts use the password **`Demo@1234`** (unless `SEED_PASSWORD` was set on the server). They use a fictional `.test` domain.

| Role | Email | What to look at |
|---|---|---|
| Lead desk / admin | `admin@brandx-demo.test` | All leads, unassigned queue, portal CSV import, price table, models, used stock (status only) |
| Sales consultant (Gomti Nagar; Models H and C) | `aarav@brandx-demo.test` | Own leads only, live 5-minute timers, AI summary and editable reply draft |
| Sales consultant (Kanpur Road; Models C and E) | `imran@brandx-demo.test` | Different showroom and models, so different leads |
| Used-car manager | `used@brandx-demo.test` | The only role that sees the suggested used-car price band and sets used prices |

Other consultants: `neha@`, `kavita@`, `rohit@`, `sanjay@` at `brandx-demo.test`.

Buyers do not sign in: the public site needs no account.

## 5. A 5-minute review path

1. **Home → Model C** (`/new/model-c`): change variant and city; the on-road breakup, validity date and EMI update. Switch the colour swatch. Press **हिन्दी** in the header.
2. **Model E, Varanasi, ZX automatic**: the price row is deliberately expired, so no number is shown (the "ask for today's price" state).
3. **Used → UC-1182** (`/used`): inspection report and masked registration. **UC-1190** shows the "Reserved" state.
4. **Book a test drive** (`/test-drive`): pick a car, day and time, then confirm. Open the confirmation link and cancel it, then book the same slot again.
5. **Send an enquiry** from a model page (tick the consent box). You see which named consultant will call.
6. **Sign in as the consultant** who got it (admin can see every lead): the lead is in the inbox with a ticking timer. Open it: AI summary, questions to ask, editable draft. Try typing "discount" in the draft: Send is blocked. Send a clean reply and the timer stops.
7. **Admin → Import portal CSV**: upload `public/sample-portal-leads.csv`; good rows are assigned, bad rows are listed.
8. **Admin → Prices**: change a road-tax % and save; the public page changes. **Used manager → Used stock**: see the suggested band next to each price. Model E has too few past sales, so it says so instead of guessing.

## 6. Security notes

- Passwords hashed with bcrypt; sessions are signed, httpOnly, same-site cookies; the role is re-read from the database on every request.
- Every staff server action re-checks sign-in and role; consultants can only open their own leads (others return 404).
- All inputs are validated on the server (zod); SQL is parameterised; honeypot and per-IP rate limits protect public forms and sign-in.
- Full registration numbers are never sent to the public pages.
