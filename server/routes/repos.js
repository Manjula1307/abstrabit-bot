const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { createWebhook, listUserRepos } = require('../githubApi');

const router = express.Router();

async function getUserToken(userId) {
  const result = await pool.query('SELECT access_token FROM users WHERE id = $1', [userId]);
  return result.rows[0]?.access_token;
}

// Repos the user owns on GitHub, so the frontend can show a picker
router.get('/available', requireAuth, async (req, res) => {
  try {
    const token = await getUserToken(req.userId);
    const repos = await listUserRepos(token);
    res.json(repos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch repos from GitHub' });
  }
});

// Repos already connected (webhook installed) for this user
router.get('/connected', requireAuth, async (req, res) => {
  const result = await pool.query(
    'SELECT id, full_name, created_at FROM repos WHERE user_id = $1 ORDER BY created_at DESC',
    [req.userId]
  );
  res.json(result.rows);
});

// Connect a repo: create the GitHub webhook, store the secret
router.post('/connect', requireAuth, async (req, res) => {
  const { full_name, github_repo_id } = req.body;
  if (!full_name || !github_repo_id) {
    return res.status(400).json({ error: 'full_name and github_repo_id are required' });
  }
  const [owner, repo] = full_name.split('/');

  try {
    const token = await getUserToken(req.userId);
    const callbackUrl = `${process.env.SERVER_URL || req.protocol + '://' + req.get('host')}/webhooks/github`;
    const { webhookId, secret } = await createWebhook(token, owner, repo, callbackUrl);

    const result = await pool.query(
      `INSERT INTO repos (user_id, github_repo_id, full_name, webhook_id, webhook_secret)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, github_repo_id)
       DO UPDATE SET webhook_id = $4, webhook_secret = $5
       RETURNING id, full_name`,
      [req.userId, github_repo_id, full_name, webhookId, secret]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Connect repo failed:', err);
    res.status(500).json({ error: 'Could not create webhook. Check that you own this repo and your token has repo scope.' });
  }
});

module.exports = router;
