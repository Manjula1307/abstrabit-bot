const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { processEvent } = require('../eventProcessor');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const { repo_id, status } = req.query;
  if (!repo_id) return res.status(400).json({ error: 'repo_id is required' });

  // Only return events for repos this user actually owns.
  // Optional status filter (?status=failed) supports the dashboard's failure view.
  const params = [repo_id, req.userId];
  let statusClause = '';
  if (status) {
    params.push(status);
    statusClause = `AND e.status = $${params.length}`;
  }

  const result = await pool.query(
    `SELECT e.id, e.event_type, e.action, e.title, e.url, e.status, e.error,
            e.action_taken, e.ai_summary, e.ai_priority, e.created_at
     FROM events e
     JOIN repos r ON r.id = e.repo_id
     WHERE e.repo_id = $1 AND r.user_id = $2 ${statusClause}
     ORDER BY e.created_at DESC
     LIMIT 100`,
    params
  );
  res.json(result.rows);
});

// Manually re-runs a failed event's processing (AI triage + rule matching +
// GitHub/Slack side effects) using the payload captured at delivery time.
// Useful when a downstream call (Slack, GitHub API) was briefly unavailable.
router.post('/:id/retry', requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT e.*, r.id as repo_id, r.full_name, r.webhook_secret
     FROM events e
     JOIN repos r ON r.id = e.repo_id
     WHERE e.id = $1 AND r.user_id = $2`,
    [req.params.id, req.userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });

  const row = result.rows[0];
  if (!row.payload) {
    return res.status(400).json({ error: 'No stored payload for this event, cannot retry' });
  }

  try {
    await processEvent({
      eventId: row.id,
      repo: { id: row.repo_id, full_name: row.full_name },
      eventType: row.event_type,
      payload: row.payload,
    });
    res.json({ ok: true });
  } catch (err) {
    await pool.query(`UPDATE events SET status = 'failed', error = $1 WHERE id = $2`, [err.message, row.id]);
    res.status(500).json({ error: 'Retry failed: ' + err.message });
  }
});

module.exports = router;
