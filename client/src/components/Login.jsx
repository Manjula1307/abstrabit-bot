import { api } from '../api';

export default function Login() {
  return (
    <div style={{ textAlign: 'center', marginTop: 80 }}>
      <p style={{ color: '#94a3b8', marginBottom: 24 }}>
        Connect a repo, set rules, and let the bot label issues and ping Slack for you.
      </p>
      <a
        href={`${api.base}/auth/github`}
        style={{
          background: '#22c55e',
          color: '#0f172a',
          padding: '12px 24px',
          borderRadius: 8,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Sign in with GitHub
      </a>
    </div>
  );
}
