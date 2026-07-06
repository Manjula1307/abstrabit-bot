import { useEffect, useState } from 'react';
import { api } from '../api';

export default function RepoConnect({ connectedRepos, onConnected }) {
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .availableRepos()
      .then(setAvailable)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const connectedNames = new Set(connectedRepos.map((r) => r.full_name));

  async function handleConnect(repo) {
    setConnectingId(repo.id);
    setError('');
    try {
      await api.connectRepo(repo.full_name, repo.id);
      onConnected();
    } catch (e) {
      setError(e.message);
    } finally {
      setConnectingId(null);
    }
  }

  if (loading) return <p>Loading your repos…</p>;

  return (
    <div style={{ marginBottom: 24 }}>
      <h3>Connect a repo</h3>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {available.map((repo) => (
          <div
            key={repo.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 10,
              background: '#1e293b',
              borderRadius: 6,
            }}
          >
            <span>{repo.full_name}</span>
            {connectedNames.has(repo.full_name) ? (
              <span style={{ color: '#22c55e' }}>Connected</span>
            ) : (
              <button
                onClick={() => handleConnect(repo)}
                disabled={connectingId === repo.id}
                style={{
                  background: '#22c55e',
                  border: 'none',
                  color: '#0f172a',
                  padding: '6px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                {connectingId === repo.id ? 'Connecting…' : 'Connect'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
