# Project context for AI assistance

This is a submission for a take-home assignment: an event-driven GitHub automation bot.

## Stack
- Backend: Node.js, Express, plain JS (no TypeScript, chosen for speed under a 6-hour deadline).
- DB: Postgres (Neon, free tier).
- Frontend: React + Vite, plain JS, inline styles (no CSS framework, to avoid setup overhead).
- Auth: GitHub OAuth App, session via signed JWT in an httpOnly cookie.
- Notifications: Slack Incoming Webhook.
- Deploy target: Render (backend), Vercel (frontend).

## Non-negotiable constraints
- Everything must run on free tiers with no credit card, anywhere.
- Webhook endpoint must verify GitHub's HMAC signature before processing anything.
- Webhook processing must be idempotent against GitHub's delivery retries (dedupe by
  `X-GitHub-Delivery`).
- No secrets in the repo, client-side code, or logs — everything sensitive comes from env vars.

## Conventions
- Every Express route file lives in `server/routes/` and exports a router.
- Auth check is the `requireAuth` middleware in `server/middleware/auth.js`; it sets `req.userId`.
- All GitHub API calls go through `server/githubApi.js` so token handling stays in one place.
- Frontend API calls go through `client/src/api.js` — don't call `fetch` directly in components.
