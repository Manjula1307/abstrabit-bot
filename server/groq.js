// Uses Groq's free, OpenAI-compatible chat completions API to summarize an
// issue/PR and suggest a priority. This is intentionally best-effort: if the
// call fails or the key isn't set, webhook processing continues without it
// rather than failing the whole event.
async function summarizeAndTriage(title, body) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn('GROQ_API_KEY not set, skipping AI triage');
    return null;
  }

  const prompt = `You triage GitHub issues. Given the title and body below, respond with
ONLY a JSON object (no markdown, no preamble) in this exact shape:
{"summary": "one sentence summary", "priority": "low" | "medium" | "high"}

Title: ${title}
Body: ${(body || '').slice(0, 1500)}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 150,
      }),
    });

    if (!res.ok) {
      console.error('Groq API error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;

    // Model sometimes wraps JSON in ```json fences despite instructions; strip defensively.
    const cleaned = raw.replace(/^```json\s*|```$/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.summary || !['low', 'medium', 'high'].includes(parsed.priority)) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.error('AI triage failed:', err.message);
    return null;
  }
}

module.exports = { summarizeAndTriage };
