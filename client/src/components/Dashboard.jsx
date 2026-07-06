import { useEffect, useState } from 'react';
import { api } from '../api';
import RepoConnect from './RepoConnect.jsx';
import RulesConfig from './RulesConfig.jsx';
import EventLog from './EventLog.jsx';

export default function Dashboard() {
  const [connectedRepos, setConnectedRepos] = useState([]);
  const [selectedRepoId, setSelectedRepoId] = useState(null);

  function loadConnected() {
    api.connectedRepos().then((repos) => {
      setConnectedRepos(repos);
      if (repos.length > 0 && !selectedRepoId) setSelectedRepoId(repos[0].id);
    });
  }

  useEffect(loadConnected, []);

  return (
    <div>
      <RepoConnect connectedRepos={connectedRepos} onConnected={loadConnected} />

      {connectedRepos.length > 0 && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label style={{ marginRight: 8, color: '#94a3b8' }}>Viewing:</label>
            <select
              value={selectedRepoId || ''}
              onChange={(e) => setSelectedRepoId(Number(e.target.value))}
              style={{ background: '#1e293b', color: '#e2e8f0', padding: 6, borderRadius: 6, border: '1px solid #334155' }}
            >
              {connectedRepos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.full_name}
                </option>
              ))}
            </select>
          </div>
          <RulesConfig repoId={selectedRepoId} />
          <EventLog repoId={selectedRepoId} />
        </>
      )}
    </div>
  );
}
