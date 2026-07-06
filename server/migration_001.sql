-- Run this in Neon's SQL editor AFTER schema.sql has already been applied.
-- Adds columns needed for the AI stretch goal and richer rule matching.

ALTER TABLE events ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS ai_priority TEXT; -- 'low' | 'medium' | 'high'

ALTER TABLE rules ADD COLUMN IF NOT EXISTS match_author TEXT;      -- optional: only match if issue/PR author is this GitHub username
ALTER TABLE rules ADD COLUMN IF NOT EXISTS match_existing_label TEXT; -- optional: only match if issue already carries this label

-- Run this too (added with the observability stretch goal):
ALTER TABLE events ADD COLUMN IF NOT EXISTS payload JSONB;
