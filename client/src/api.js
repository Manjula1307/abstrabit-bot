const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include', // sends the httpOnly session cookie
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  base: API_BASE,
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  availableRepos: () => request('/api/repos/available'),
  connectedRepos: () => request('/api/repos/connected'),
  connectRepo: (full_name, github_repo_id) =>
    request('/api/repos/connect', { method: 'POST', body: JSON.stringify({ full_name, github_repo_id }) }),
  events: (repo_id, status) => request(`/api/events?repo_id=${repo_id}${status ? `&status=${status}` : ''}`),
  retryEvent: (id) => request(`/api/events/${id}/retry`, { method: 'POST' }),
  rules: (repo_id) => request(`/api/rules?repo_id=${repo_id}`),
  createRule: (rule) => request('/api/rules', { method: 'POST', body: JSON.stringify(rule) }),
  deleteRule: (id) => request(`/api/rules/${id}`, { method: 'DELETE' }),
};
