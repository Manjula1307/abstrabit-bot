const pool = require('./db');
const { addLabel, postComment } = require('./githubApi');
const { sendSlackMessage } = require('./slack');
const { summarizeAndTriage } = require('./groq');

// Runs AI triage + rule matching + GitHub/Slack side effects for one event,
// and updates its row with the outcome. Shared by the live webhook path and
// the manual "retry" button in the dashboard, so both behave identically.
async function processEvent({ eventId, repo, eventType, payload }) {
  const subject = payload.issue || payload.pull_request || null;
  const title = subject ? subject.title : `push to ${payload.ref || 'branch'}`;
  const url = subject ? subject.html_url : payload.compare;

  let actionsTaken = [];
  let matchedRuleId = null;
  let aiSummary = null;
  let aiPriority = null;

  if (subject && (eventType === 'issues' || eventType === 'pull_request')) {
    const triage = await summarizeAndTriage(subject.title, subject.body);
    if (triage) {
      aiSummary = triage.summary;
      aiPriority = triage.priority;
    }

    const existingLabels = (subject.labels || []).map((l) => l.name.toLowerCase());
    const authorLogin = (subject.user && subject.user.login) || '';
    const haystack = `${subject.title || ''} ${subject.body || ''}`.toLowerCase();

    const rulesResult = await pool.query(
      'SELECT * FROM rules WHERE repo_id = $1 AND event_type = $2',
      [repo.id, eventType]
    );

    const rule = rulesResult.rows.find((r) => {
      const keywordOk = haystack.includes(r.keyword.toLowerCase());
      const authorOk = !r.match_author || r.match_author.toLowerCase() === authorLogin.toLowerCase();
      const labelOk = !r.match_existing_label || existingLabels.includes(r.match_existing_label.toLowerCase());
      return keywordOk && authorOk && labelOk;
    });

    if (rule) {
      matchedRuleId = rule.id;
      const [owner, repoName] = repo.full_name.split('/');
      const issueNumber = subject.number;

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
        .replace('{url}', url)
        .replace('{summary}', aiSummary || '')
        .replace('{priority}', aiPriority || '');
      const sent = await sendSlackMessage(slackText);
      if (sent) actionsTaken.push('sent Slack notification');
    }
  }

  await pool.query(
    `UPDATE events SET status = 'processed', action_taken = $1, matched_rule_id = $2, ai_summary = $3, ai_priority = $4, error = NULL WHERE id = $5`,
    [actionsTaken.join(', ') || 'no rule matched', matchedRuleId, aiSummary, aiPriority, eventId]
  );
}

module.exports = { processEvent };
