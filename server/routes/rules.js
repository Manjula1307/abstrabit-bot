const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Confirms the repo belongs to the logged-in user before letting them touch its rules
async function assertOwnsRepo(userId, repoId) {
  const result = await pool.query('SELECT id FROM repos WHERE id = $1 AND user_id = $2', [repoId, userId]);
  return result.rows.length > 0;
}

router.get('/', requireAuth, async (req, res) => {
  const { repo_id } = req.query;
  if (!repo_id || !(await assertOwnsRepo(req.userId, repo_id))) {
    return res.status(403).json({ error: 'Not your repo' });
  }
  const result = await pool.query('SELECT * FROM rules WHERE repo_id = $1 ORDER BY id DESC', [repo_id]);
  res.json(result.rows);
});

router.post('/', requireAuth, async (req, res) => {
  const { repo_id, event_type, keyword, label, comment, slack_message } = req.body;
  if (!repo_id || !keyword || !(await assertOwnsRepo(req.userId, repo_id))) {
    return res.status(400).json({ error: 'repo_id and keyword are required, and repo must be yours' });
  }
  const result = await pool.query(
    `INSERT INTO rules (repo_id, event_type, keyword, label, comment, slack_message)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [repo_id, event_type || 'issues', keyword, label || null, comment || null, slack_message || null]
  );
  res.json(result.rows[0]);
});

router.delete('/:id', requireAuth, async (req, res) => {
  // join through repos to make sure this rule belongs to one of the user's repos
  const result = await pool.query(
    `DELETE FROM rules WHERE id = $1 AND repo_id IN (SELECT id FROM repos WHERE user_id = $2) RETURNING id`,
    [req.params.id, req.userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
  res.json({ ok: true });
});

module.exports = router;
