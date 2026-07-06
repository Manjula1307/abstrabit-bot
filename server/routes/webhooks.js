const express = require('express');
const pool = require('../db');
const { verifySignature, addLabel, postComment } = require('../githubApi');
const { sendSlackMessage } = require('../slack');

const router = express.Router();

// NOTE: this route is mounted with express.raw() in server.js (not express.json())
// because HMAC signature verification needs the exact raw bytes GitHub signed.
router.post('/github', async (req, res) => {
  const deliveryId = req.headers['x-github-delivery'];
  const eventType = req.headers['x-github-event'];
  const signature = req.headers['x-hub-signature-256'];
  const rawBody = req.body; // Buffer, thanks to express.raw()

  if (!deliveryId || !eventType) {
    return res.status(400).json({ error: 'Missing GitHub headers' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const githubRepoId = payload.repository && payload.repository.id;
  if (!githubRepoId) {
    // e.g. "ping" events sent when the webhook is first created have no meaningful repo action
    return res.status(200).json({ ok: true, note: 'No repository in payload, ignoring' });
  }

  // Look up which of our tracked repos this belongs to
  const repoResult = await pool.query('SELECT * FROM repos WHERE github_repo_id = $1', [githubRepoId]);
  if (repoResult.rows.length === 0) {
    return res.status(404).json({ error: 'Unknown repo' });
  }
  const repo = repoResult.rows[0];

  // Reject forged or tampered requests before doing anything else
  if (!verifySignature(repo.webhook_secret, rawBody, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Idempotency: GitHub redelivers on timeouts/errors. If we've already
  // fully processed this delivery_id, don't do the side effects again.
  const existing = await pool.query('SELECT * FROM events WHERE delivery_id = $1', [deliveryId]);
  if (existing.rows.length > 0 && existing.rows[0].status === 'processed') {
    return res.status(200).json({ ok: true, note: 'Already processed, skipping' });
  }

  // Only issues and pull_request carry a title/body/number we can act on;
  // push events are recorded but not rule-matched.
  const subject = payload.issue || payload.pull_request || null;
  const title = subject ? subject.title : `push to ${payload.ref || 'branch'}`;
  const url = subject ? subject.html_url : payload.compare;
  const action = payload.action || null;

  // Record (or update, if this is a retry) the event first, before acting,
  // so nothing is silently lost even if the next steps fail.
  const eventRow = await pool.query(
    `INSERT INTO events (repo_id, delivery_id, event_type, action, title, url, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'received')
     ON CONFLICT (delivery_id) DO UPDATE SET status = 'received'
     RETURNING id`,
    [repo.id, deliveryId, eventType, action, title, url]
  );
  const eventId = eventRow.rows[0].id;

  try {
    let actionsTaken = [];
    let matchedRuleId = null;

    if (subject && (eventType === 'issues' || eventType === 'pull_request')) {
      const haystack = `${subject.title || ''} ${subject.body || ''}`.toLowerCase();
      const rulesResult = await pool.query(
        'SELECT * FROM rules WHERE repo_id = $1 AND event_type = $2',
        [repo.id, eventType]
      );
      const rule = rulesResult.rows.find((r) => haystack.includes(r.keyword.toLowerCase()));

      if (rule) {
        matchedRuleId = rule.id;
        const [owner, repoName] = repo.full_name.split('/');
        const issueNumber = subject.number;

        // Look up the connected user's token to act as them on GitHub
        const userResult = await pool.query(
          'SELECT access_token FROM users WHERE id = (SELECT user_id FROM repos WHERE id = $1)',
          [repo.id]
        );
        const token = userResult.rows[0].access_token;

        if (rule.label) {
          await addLabel(token, owner, repoName, issueNumber, rule.label);
          actionsTaken.push(`added label "${rule.label}"`);
        }
        if (rule.comment) {
          await postComment(token, owner, repoName, issueNumber, rule.comment);
          actionsTaken.push('posted comment');
        }

        const slackText = (rule.slack_message || `Rule matched on {title}: {url}`)
          .replace('{title}', title)
          .replace('{url}', url);
        const sent = await sendSlackMessage(slackText);
        if (sent) actionsTaken.push('sent Slack notification');
      }
    }

    await pool.query(
      `UPDATE events SET status = 'processed', action_taken = $1, matched_rule_id = $2 WHERE id = $3`,
      [actionsTaken.join(', ') || 'no rule matched', matchedRuleId, eventId]
    );

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook processing failed:', err);
    // Mark as failed (not "processed") so a GitHub redelivery will retry the side effects.
    // Return 500 so GitHub knows to redeliver.
    await pool.query(`UPDATE events SET status = 'failed', error = $1 WHERE id = $2`, [
      err.message,
      eventId,
    ]);
    res.status(500).json({ error: 'Processing failed, will retry on redelivery' });
  }
});

module.exports = router;
