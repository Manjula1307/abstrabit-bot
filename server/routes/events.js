const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const { repo_id } = req.query;
  if (!repo_id) return res.status(400).json({ error: 'repo_id is required' });

  // Only return events for repos this user actually owns
  const result = await pool.query(
    `SELECT e.* FROM events e
     JOIN repos r ON r.id = e.repo_id
     WHERE e.repo_id = $1 AND r.user_id = $2
     ORDER BY e.created_at DESC
     LIMIT 100`,
    [repo_id, req.userId]
  );
  res.json(result.rows);
});

module.exports = router;
