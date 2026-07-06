const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Step 1: redirect to GitHub's authorize screen.
// "repo" scope is required so we can list repos and create webhooks on them.
router.get('/github', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope: 'repo read:user',
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

// Step 2: GitHub redirects back here with a ?code=
router.get('/github/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');

  try {
    // Exchange code for an access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('OAuth exchange failed:', tokenData);
      return res.status(401).send('GitHub OAuth failed');
    }

    // Fetch the GitHub profile for this token
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const ghUser = await userRes.json();

    // Upsert into our users table
    const result = await pool.query(
      `INSERT INTO users (github_id, username, avatar_url, access_token)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (github_id)
       DO UPDATE SET username = $2, avatar_url = $3, access_token = $4
       RETURNING id`,
      [ghUser.id, ghUser.login, ghUser.avatar_url, tokenData.access_token]
    );
    const userId = result.rows[0].id;

    const sessionToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none', // frontend and backend are on different domains
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(process.env.CLIENT_URL);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send('Login failed');
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const result = await pool.query(
    'SELECT id, username, avatar_url FROM users WHERE id = $1',
    [req.userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json(result.rows[0]);
});

router.post('/logout', (req, res) => {
  res.clearCookie('session');
  res.json({ ok: true });
});

module.exports = router;
