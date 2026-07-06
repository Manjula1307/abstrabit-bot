const { Octokit } = require('@octokit/rest');
const crypto = require('crypto');

function octokitFor(accessToken) {
  return new Octokit({ auth: accessToken });
}

// Creates a webhook on the given repo, returns { webhookId, secret }.
async function createWebhook(accessToken, owner, repo, callbackUrl) {
  const octokit = octokitFor(accessToken);
  const secret = crypto.randomBytes(24).toString('hex');

  const { data } = await octokit.repos.createWebhook({
    owner,
    repo,
    config: {
      url: callbackUrl,
      content_type: 'json',
      secret,
    },
    events: ['issues', 'pull_request', 'push'],
    active: true,
  });

  return { webhookId: data.id, secret };
}

async function addLabel(accessToken, owner, repo, issueNumber, label) {
  const octokit = octokitFor(accessToken);
  await octokit.issues.addLabels({
    owner,
    repo,
    issue_number: issueNumber,
    labels: [label],
  });
}

async function postComment(accessToken, owner, repo, issueNumber, body) {
  const octokit = octokitFor(accessToken);
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}

async function listUserRepos(accessToken) {
  const octokit = octokitFor(accessToken);
  const { data } = await octokit.repos.listForAuthenticatedUser({
    per_page: 100,
    sort: 'updated',
    affiliation: 'owner',
  });
  return data.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    private: r.private,
  }));
}

// Verifies GitHub's HMAC signature on incoming webhook payloads.
// This is what stops forged requests from hitting your automation logic.
function verifySignature(secret, rawBody, signatureHeader) {
  if (!signatureHeader) return false;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signatureHeader));
  } catch {
    return false; // length mismatch etc.
  }
}

module.exports = {
  createWebhook,
  addLabel,
  postComment,
  listUserRepos,
  verifySignature,
};
