// Typed fetch wrappers for all API endpoints.
// All requests include credentials (session cookie) automatically.

const BASE = '/api'

function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
}

// --- Journal ---

export const journalApi = {
  get: (date: string) => apiFetch(`/journal/${date}`),
  put: (date: string, body: unknown) =>
    apiFetch(`/journal/${date}`, { method: 'PUT', body: JSON.stringify(body) }),
  history: () => apiFetch('/journal/history'),
}

// --- Gym ---

export const gymApi = {
  get: (date: string) => apiFetch(`/gym/${date}`),
  put: (date: string, body: unknown) =>
    apiFetch(`/gym/${date}`, { method: 'PUT', body: JSON.stringify(body) }),
}

// --- Reading ---

export const readingApi = {
  get: (date: string) => apiFetch(`/reading/${date}`),
  put: (date: string, body: unknown) =>
    apiFetch(`/reading/${date}`, { method: 'PUT', body: JSON.stringify(body) }),
}

// --- Calendar ---

export const calendarApi = {
  getMonth: (month: string) => apiFetch(`/calendar?month=${month}`),
}

// --- Media ---

export const mediaApi = {
  getUploadUrl: () => apiFetch('/media/upload-url', { method: 'POST' }),
  deleteMedia: (id: string) => apiFetch(`/media/${id}`, { method: 'DELETE' }),
}

// --- Push ---

export const pushApi = {
  subscribe: (subscription: unknown) =>
    apiFetch('/push/subscribe', { method: 'POST', body: JSON.stringify(subscription) }),
  unsubscribe: () => apiFetch('/push/subscribe', { method: 'DELETE' }),
}

// --- Settings ---

export const settingsApi = {
  get: () => apiFetch('/settings'),
  put: (body: unknown) =>
    apiFetch('/settings', { method: 'PUT', body: JSON.stringify(body) }),
}

// --- Highlights ---

export const highlightsApi = {
  getMonth: (month: string) => apiFetch(`/highlights?month=${month}`),
}

// --- Streak ---

export const streakApi = {
  get: () => apiFetch('/streak'),
}

// --- Spotify ---

export const spotifyApi = {
  getTopTrack: (date: string) => apiFetch(`/spotify/top-track?date=${date}`),
  startAuth: () => apiFetch('/spotify/auth'),
}

// --- Auth ---

export const authApi = {
  me: () => apiFetch('/auth/me'),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
}
