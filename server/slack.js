// Sends a message to the Slack Incoming Webhook URL.
// Deliberately swallows failures into a returned boolean rather than throwing —
// a Slack outage should not stop us from still labeling/commenting on GitHub,
// and should not crash webhook processing.
async function sendSlackMessage(text) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    console.warn('SLACK_WEBHOOK_URL not set, skipping Slack notification');
    return false;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch (err) {
    console.error('Slack notification failed:', err.message);
    return false;
  }
}

module.exports = { sendSlackMessage };
