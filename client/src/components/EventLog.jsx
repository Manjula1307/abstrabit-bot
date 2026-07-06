import { useEffect, useState } from 'react';
import { api } from '../api';

export default function EventLog({ repoId }) {
  const [events, setEvents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [retryingId, setRetryingId] = useState(null);

  function load() {
    if (!repoId) return;
    api.events(repoId, statusFilter || undefined).then(setEvents).catch(console.error);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000); // simple polling refresh
    return () => clearInterval(interval);
  }, [repoId, statusFilter]);

  if (!repoId) return null;

  async function handleRetry(id) {
    setRetryingId(id);
    try {
      await api.retryEvent(id);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Event log</h3>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ background: '#1e293b', color: '#e2e8f0', padding: 6, borderRadius: 6, border: '1px solid #334155' }}
        >
          <option value="">All statuses</option>
          <option value="processed">Processed</option>
          <option value="failed">Failed</option>
          <option value="received">Received (in progress)</option>
        </select>
      </div>
      {events.length === 0 && <p style={{ color: '#94a3b8' }}>No events yet. Open an issue on the repo to test.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {events.map((e) => (
          <div key={e.id} style={{ background: '#1e293b', padding: 10, borderRadius: 6, fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{e.event_type}{e.action ? ` · ${e.action}` : ''}</strong>
              <span style={{ color: statusColor(e.status) }}>{e.status}</span>
            </div>
            {e.title && <div style={{ color: '#cbd5e1' }}>{e.title}</div>}
            {e.ai_summary && (
              <div style={{ color: '#a5b4fc', marginTop: 4, fontStyle: 'italic' }}>
                🤖 {e.ai_summary}
                {e.ai_priority && (
                  <span style={{ marginLeft: 8, color: priorityColor(e.ai_priority), fontStyle: 'normal' }}>
                    [{e.ai_priority} priority]
                  </span>
                )}
              </div>
            )}
            {e.action_taken && <div style={{ color: '#94a3b8', marginTop: 4 }}>→ {e.action_taken}</div>}
            {e.error && <div style={{ color: '#f87171', marginTop: 4 }}>Error: {e.error}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span style={{ color: '#64748b', fontSize: 12 }}>{new Date(e.created_at).toLocaleString()}</span>
              {e.status === 'failed' && (
                <button
                  onClick={() => handleRetry(e.id)}
                  disabled={retryingId === e.id}
                  style={{
                    background: 'transparent',
                    border: '1px solid #f87171',
                    color: '#f87171',
                    padding: '2px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  {retryingId === e.id ? 'Retrying…' : 'Retry'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function statusColor(status) {
  if (status === 'processed') return '#22c55e';
  if (status === 'failed') return '#f87171';
  return '#facc15';
}

function priorityColor(priority) {
  if (priority === 'high') return '#f87171';
  if (priority === 'medium') return '#facc15';
  return '#94a3b8';
}
