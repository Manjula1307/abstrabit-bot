import { useEffect, useState } from 'react';
import { api } from '../api';

export default function EventLog({ repoId }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!repoId) return;
    const load = () => api.events(repoId).then(setEvents).catch(console.error);
    load();
    const interval = setInterval(load, 5000); // simple polling refresh
    return () => clearInterval(interval);
  }, [repoId]);

  if (!repoId) return null;

  return (
    <div>
      <h3>Event log</h3>
      {events.length === 0 && <p style={{ color: '#94a3b8' }}>No events yet. Open an issue on the repo to test.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {events.map((e) => (
          <div key={e.id} style={{ background: '#1e293b', padding: 10, borderRadius: 6, fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{e.event_type}{e.action ? ` · ${e.action}` : ''}</strong>
              <span style={{ color: statusColor(e.status) }}>{e.status}</span>
            </div>
            {e.title && <div style={{ color: '#cbd5e1' }}>{e.title}</div>}
            {e.action_taken && <div style={{ color: '#94a3b8', marginTop: 4 }}>→ {e.action_taken}</div>}
            {e.error && <div style={{ color: '#f87171', marginTop: 4 }}>Error: {e.error}</div>}
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
              {new Date(e.created_at).toLocaleString()}
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
