# Event-Driven GitHub Automation Bot

A web app + bot that reacts to GitHub activity: sign in with GitHub, connect a repo,
and configure keyword rules that auto-label issues/PRs, post comments, and notify Slack —
all visible on a live dashboard.

## What it does

1. Sign in with GitHub (OAuth).
2. Connect a repo you own — this registers a webhook on it automatically.
3. Add rules like: event `issues`, keyword `bug` → label `bug`, Slack message `🐛 {title}`.
4. When someone opens a matching issue/PR, the bot labels it, comments (if configured),
   and posts to Slack — and every event shows up in the dashboard's live log with its status
   (received / processed / failed).

## Stretch goals implemented

- **AI triage (Groq)**: every issue/PR is run through Groq's free `llama-3.3-70b-versatile`
  model to produce a one-sentence summary and a low/medium/high priority, shown in the
  dashboard and available in Slack messages via `{summary}`/`{priority}` template variables.
  Fails open — if `GROQ_API_KEY` is unset or the call errors, the event still processes
  normally, just without the AI fields.
- **Configurable rules beyond keyword-only**: rules can optionally also require a specific
  author (`match_author`) and/or an existing label already on the issue (`match_existing_label`),
  in addition to the required keyword match — all configured from the dashboard UI, no code
  changes needed.
- **Observability**: the dashboard's event log can be filtered by status (processed / failed /
  received), and failed events carry their original webhook payload so they can be manually
  **retried** from the UI with one click, without waiting for GitHub's own redelivery.

## Architecture

- **Backend**: Node.js + Express. Postgres (Neon) for storage. `@octokit/rest` for the GitHub API.
- **Frontend**: React + Vite, polls the backend every 5s for a live-ish log.
- **Auth**: GitHub OAuth App → signed httpOnly JWT cookie (not full OAuth App session storage,
  to keep it stateless and simple).
- **Webhook security**: every incoming webhook's `X-Hub-Signature-256` is verified with
  `crypto.timingSafeEqual` against a per-repo secret generated at connect-time. Unsigned or
  mismatched requests are rejected with 401 before touching any business logic.
- **Idempotency**: each webhook delivery carries a unique `X-GitHub-Delivery` id. We store it
  with a unique constraint and only skip re-processing if a prior delivery already reached
  `status = processed`. Deliveries that previously failed are retried on redelivery.
- **Resilience**: the event row is written *before* we act on GitHub/Slack, so if either call
  fails partway through, we still have a record (`status = failed`, with the error message)
  instead of silently losing the event. GitHub will redeliver failed webhooks automatically.

## Local setup

### 1. Database
Create a free Postgres database at [neon.tech](https://neon.tech) (no card required).
Run `server/schema.sql` against it (Neon's SQL editor, or `psql <connection-string> -f schema.sql`).
This already includes the AI/observability columns — if you're upgrading an existing DB that
was set up before those were added, run `server/migration_001.sql` instead.

### 2. GitHub OAuth App
GitHub Settings → Developer settings → OAuth Apps → New OAuth App.
- Homepage URL: your frontend URL (or `http://localhost:5173` for local dev)
- Authorization callback URL: `http://localhost:4000/auth/github/callback` for local dev,
  or `https://<your-render-app>.onrender.com/auth/github/callback` once deployed.

### 3. Slack
Create a free Slack workspace/app at [api.slack.com/apps](https://api.slack.com/apps) →
Incoming Webhooks → Activate → Add New Webhook to Workspace. Copy the URL.

### 3b. Groq (optional, for AI triage)
Get a free API key at [console.groq.com](https://console.groq.com) (no card required).
Set it as `GROQ_API_KEY`. If skipped, the app works fine without the AI summary/priority fields.

### 4. Backend
```bash
cd server
cp .env.example .env   # fill in DATABASE_URL, GITHUB_CLIENT_ID/SECRET, SLACK_WEBHOOK_URL, JWT_SECRET
npm install
npm start
```

### 5. Frontend
```bash
cd client
cp .env.example .env   # VITE_API_URL=http://localhost:4000
npm install
npm run dev
```

Visit `http://localhost:5173`.

## Deployment

- **Backend → Render**: New Web Service, root directory `server`, build command `npm install`,
  start command `npm start`. Add all `.env` vars in Render's dashboard. Once you have the Render
  URL, update `GITHUB_CALLBACK_URL` and `SERVER_URL` to match it, and update the GitHub OAuth
  App's callback URL too.
- **Frontend → Vercel**: New Project, root directory `client`, framework preset Vite.
  Set `VITE_API_URL` to your Render backend URL in Vercel's env vars.
- After both are live, update the backend's `CLIENT_URL` env var to the Vercel URL and redeploy
  (needed for CORS and the post-login redirect).

## Testing it end-to-end

1. Open the deployed frontend, sign in with GitHub.
2. Connect a repo you own (a fresh test repo is easiest).
3. Add a rule: event `issues`, keyword `bug`, label `bug`, Slack message `New bug: {title}`.
4. Open an issue on that repo titled "there's a bug here" — watch it get labeled and see the
   event appear in the dashboard within ~5 seconds, plus a Slack message.

## Environment variables

See `server/.env.example` and `client/.env.example`.

## Known limitations / what I'd add with more time

- No GitHub App / JWT installation-token auth — this uses a plain OAuth App, which is simpler
  but means the bot acts as the connecting user rather than as an independent bot identity.
  This was a deliberate scope cut given the time budget: it's the highest-effort, highest-risk
  stretch goal and touches the entire auth model.
- Manual retry re-runs processing but doesn't implement exponential backoff or an automatic
  retry queue — it relies on GitHub's own redelivery plus a manual button for the rest.
- Rule matching is still substring/exact-match based (keyword + optional author + optional
  existing label), not full regex or a rule-builder UI.
