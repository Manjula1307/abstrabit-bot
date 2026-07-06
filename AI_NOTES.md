# AI_NOTES.md

## Tools used
Claude (Sonnet) via claude.ai, used to scaffold the initial backend/frontend structure under a
tight time budget, then hand-edited and tested locally against real GitHub/Neon/Slack accounts.

## How work was split
Claude generated the first pass of every file: Express routes, the webhook signature/idempotency
logic, the Octokit wrapper, and the React dashboard components. I reviewed each file, tested the
full flow against my own GitHub OAuth App, Neon DB, and Slack webhook, and did all the account
setup and deployment myself. I also made the call to build an AI triage stretch goal (Groq),
test it, and then cut it when I couldn't verify it was reliable in the time I had left — see
below.

## Key decisions I made
1. **Plain OAuth App instead of a GitHub App** — a full GitHub App (JWT + installation tokens)
   is more correct for a production bot but is a stretch goal; given the time budget, an OAuth
   App gets the same core webhook/label/comment flow working with far less setup surface.
2. **Postgres over MySQL** — Neon's free tier requires no card and the assignment suggested it
   directly, so I used it instead of my usual stack.
3. **Cut the AI stretch goal instead of shipping it half-verified** — I built the Groq-based
   summarize/triage step, and it worked correctly in local testing (confirmed AI summary +
   priority appearing in the dashboard). But once deployed to Render, I couldn't get it to
   produce the same output in the time I had left to debug (env var propagation and Render's
   free-tier cold-start/log gaps made it hard to confirm reliably), so I reverted that commit
   and shipped the core flow, which I *could* fully verify end-to-end on the live URL.

## Hardest bug / wrong turn
The trickiest bug was in `server/db.js`: Neon's free tier silently drops idle Postgres
connections after a period of inactivity. The `pg` library emits an `'error'` event on the
connection pool when that happens — and without a listener for that event, it's an *unhandled*
error that crashes the entire Node process. I noticed this because the server would die
unexpectedly between test requests with no clear stack trace pointing at my own code. The fix
was adding a `pool.on('error', ...)` handler that logs the disconnect instead of letting it
crash the process — a real reliability gap, and one the assignment explicitly grades for
("does it lose events if a downstream service is briefly unavailable").

## What I'd improve with more time
- Re-attempt the AI triage step (Groq), with proper structured logging around the API call so
  a deploy-only failure is diagnosable instead of silent.
- Move from an OAuth App to a proper GitHub App for multi-repo, non-user-bound bot identity.
- Add structured logging and a visible retry/failure history in the dashboard, not just a status
  column.
