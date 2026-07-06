# AI_NOTES.md

## Tools used
Claude (Sonnet) via claude.ai, used to scaffold the initial backend/frontend structure under a
tight time budget, then hand-edited and tested locally against real GitHub/Neon/Slack accounts.

## How work was split
Claude generated the first pass of every file: Express routes, the webhook signature/idempotency
logic, the Octokit wrapper, and the React dashboard components. I reviewed each file, adjusted
[fill in: e.g. "the rule-matching logic to also check pull_request bodies", "the CORS/cookie
settings once I hit a real cross-origin issue in deployment", etc — replace with what you
actually changed], and did all the account setup (OAuth App, Neon DB, Slack webhook) and
deployment myself.

## Key decisions I made
1. **Plain OAuth App instead of a GitHub App** — a full GitHub App (JWT + installation tokens)
   is more correct for a production bot but is a stretch goal; given the time budget, an OAuth
   App gets the same core webhook/label/comment flow working with far less setup surface.
2. **Postgres over MySQL** — despite MySQL being my usual stack, Neon's free tier requires no
   card and the assignment suggested it directly, so I didn't fight my own tooling preference
   against the constraint.
3. [Fill in your third decision, e.g. why you chose polling over websockets for the live log,
   or why rules are matched server-side per-event rather than via GitHub's own label-filter
   webhooks.]

## Hardest bug / wrong turn
[This is the section they read most closely — fill this in honestly once you've actually run
it. Likely candidates based on this stack: a CORS/cookie issue between the Vercel frontend and
Render backend (SameSite=None + Secure requirements), a webhook signature mismatch caused by
body-parsing order (express.json() consuming the raw body before verification), or GitHub
OAuth's redirect_uri needing to match *exactly* including trailing slashes. Describe what Claude
suggested, why it was wrong, how you noticed (the actual error/symptom), and what you changed.]

## What I'd improve with more time
- Add the AI stretch goal: run issue/PR text through Groq's free LLaMA API (already used this
  in an earlier project, MediScan) to auto-suggest a label/priority instead of pure keyword
  matching.
- Move from an OAuth App to a proper GitHub App for multi-repo, non-user-bound bot identity.
- Add structured logging and a visible retry/failure history in the dashboard, not just a status
  column.
