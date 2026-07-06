import { useEffect, useState } from 'react';
import { api } from '../api';

export default function RulesConfig({ repoId }) {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState({
    event_type: 'issues',
    keyword: '',
    label: '',
    comment: '',
    slack_message: '',
    match_author: '',
    match_existing_label: '',
  });
  const [saving, setSaving] = useState(false);

  function load() {
    if (repoId) api.rules(repoId).then(setRules).catch(console.error);
  }

  useEffect(load, [repoId]);

  if (!repoId) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.keyword.trim()) return;
    setSaving(true);
    try {
      await api.createRule({ repo_id: repoId, ...form });
      setForm({
        event_type: 'issues',
        keyword: '',
        label: '',
        comment: '',
        slack_message: '',
        match_author: '',
        match_existing_label: '',
      });
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <h3>Rules</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <select
          value={form.event_type}
          onChange={(e) => setForm({ ...form, event_type: e.target.value })}
          style={inputStyle}
        >
          <option value="issues">issues</option>
          <option value="pull_request">pull_request</option>
        </select>
        <input
          placeholder="keyword (e.g. bug)"
          value={form.keyword}
          onChange={(e) => setForm({ ...form, keyword: e.target.value })}
          style={inputStyle}
          required
        />
        <input
          placeholder="label to add"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="comment to post"
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="Slack message ({title}, {url}, {summary}, {priority})"
          value={form.slack_message}
          onChange={(e) => setForm({ ...form, slack_message: e.target.value })}
          style={{ ...inputStyle, minWidth: 260 }}
        />
        <input
          placeholder="only if author is… (optional)"
          value={form.match_author}
          onChange={(e) => setForm({ ...form, match_author: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="only if already labeled… (optional)"
          value={form.match_existing_label}
          onChange={(e) => setForm({ ...form, match_existing_label: e.target.value })}
          style={inputStyle}
        />
        <button type="submit" disabled={saving} style={btnStyle}>
          {saving ? 'Adding…' : 'Add rule'}
        </button>
      </form>
      <p style={{ color: '#64748b', fontSize: 12, marginTop: -6, marginBottom: 12 }}>
        A rule fires only when the keyword matches AND (if set) the author and existing-label filters also match.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rules.map((r) => (
          <div
            key={r.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#1e293b',
              padding: 8,
              borderRadius: 6,
              fontSize: 14,
            }}
          >
            <span>
              [{r.event_type}] title/body contains "<strong>{r.keyword}</strong>"
              {r.match_author && ` · author is "${r.match_author}"`}
              {r.match_existing_label && ` · already labeled "${r.match_existing_label}"`} →{' '}
              {r.label && `label "${r.label}"`} {r.comment && '· comment'} {r.slack_message && '· Slack'}
            </span>
            <button
              onClick={() => api.deleteRule(r.id).then(load)}
              style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
            >
              remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle = {
  background: '#0f172a',
  border: '1px solid #334155',
  color: '#e2e8f0',
  padding: '8px 10px',
  borderRadius: 6,
};
const btnStyle = {
  background: '#22c55e',
  border: 'none',
  color: '#0f172a',
  padding: '8px 14px',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
};
