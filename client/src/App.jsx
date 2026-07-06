import { useEffect, useState } from 'react';
import { api } from './api';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.center}>Loading…</div>;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ margin: 0, fontSize: 20 }}>GitHub Automation Bot</h1>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>Hi, {user.username}</span>
            <button
              onClick={() => api.logout().then(() => setUser(null))}
              style={styles.buttonSecondary}
            >
              Log out
            </button>
          </div>
        )}
      </header>
      <main style={styles.main}>
        {user ? <Dashboard /> : <Login />}
      </main>
    </div>
  );
}

const styles = {
  page: { fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid #1e293b',
  },
  main: { padding: 24, maxWidth: 900, margin: '0 auto' },
  center: { display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' },
  buttonSecondary: {
    background: 'transparent',
    border: '1px solid #334155',
    color: '#e2e8f0',
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
