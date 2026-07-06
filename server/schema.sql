-- Run this once against your Neon database (Neon SQL editor, or psql).

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  github_id BIGINT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  access_token TEXT NOT NULL, -- OAuth token, used server-side only, never sent to client
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS repos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_repo_id BIGINT NOT NULL,
  full_name TEXT NOT NULL, -- e.g. "octocat/hello-world"
  webhook_id BIGINT,
  webhook_secret TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, github_repo_id)
);

CREATE TABLE IF NOT EXISTS rules (
  id SERIAL PRIMARY KEY,
  repo_id INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'issues', -- 'issues' | 'pull_request'
  keyword TEXT NOT NULL,        -- matched case-insensitively against title+body
  label TEXT,                   -- label to add on match (nullable)
  comment TEXT,                 -- comment to post on match (nullable)
  slack_message TEXT,           -- message template, {title}/{url}/{summary}/{priority} get substituted
  match_author TEXT,            -- optional extra filter: only match if issue/PR author is this username
  match_existing_label TEXT,    -- optional extra filter: only match if issue already carries this label
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  repo_id INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  delivery_id TEXT UNIQUE NOT NULL, -- X-GitHub-Delivery header, used for idempotency
  event_type TEXT NOT NULL,
  action TEXT,                       -- e.g. "opened", "closed"
  title TEXT,
  url TEXT,
  matched_rule_id INTEGER REFERENCES rules(id),
  action_taken TEXT,                 -- human-readable summary of what the bot did
  status TEXT NOT NULL DEFAULT 'received', -- received | processed | failed
  error TEXT,
  ai_summary TEXT,                   -- one-sentence AI summary of the issue/PR (Groq)
  ai_priority TEXT,                  -- 'low' | 'medium' | 'high', AI-suggested triage priority
  payload JSONB,                     -- raw webhook payload, kept so failed events can be manually retried
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_repo ON events(repo_id, created_at DESC);
