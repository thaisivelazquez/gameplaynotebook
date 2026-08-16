const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  getGames: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/games${qs ? `?${qs}` : ''}`);
  },
  savePick: (payload, token) => request('/picks', { method: 'POST', body: payload, token }),
  getMyPicks: (token) => request('/picks/me', { token }),
  getLeaderboard: () => request('/picks/leaderboard'),
  getPlayers: (position) => request(`/players${position ? `?position=${position}` : ''}`),
  getCategories: (position) => request(`/players/categories/${position}`),
  rankPlayers: (payload) => request('/players/rank', { method: 'POST', body: payload }),
  getRules: (token) => request('/rules/me', { token }),
  saveRules: (payload, token) => request('/rules/me', { method: 'PUT', body: payload, token }),
  getRoster: (token) => request('/roster/me', { token }),
  setRosterSlot: (payload, token) => request('/roster', { method: 'POST', body: payload, token }),
  clearRosterSlot: (slot, token) => request(`/roster/${slot}`, { method: 'DELETE', token }),
  clearRoster: (token) => request('/roster', { method: 'DELETE', token }),
  recommendRoster: (token) => request('/roster/recommend', { method: 'POST', token }),
};