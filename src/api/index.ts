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
  getImages: (date: string) => apiFetch(`/journal/${date}/images`),
  saveImage: (date: string, body: { r2_url: string; caption?: string }) =>
    apiFetch(`/journal/${date}/images`, { method: 'POST', body: JSON.stringify(body) }),
  // Direct file upload — single FormData POST (preferred over the upload-url flow)
  uploadImage: (date: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return fetch(`/api/journal/${date}/images`, {
      method: 'POST',
      credentials: 'include',
      body: fd,
      // No Content-Type header — browser sets multipart/form-data with boundary automatically
    })
  },
}

// --- Gym ---

export const gymApi = {
  get: (date: string) => apiFetch(`/gym/${date}`),
  put: (date: string, body: unknown) =>
    apiFetch(`/gym/${date}`, { method: 'PUT', body: JSON.stringify(body) }),
  history: () => apiFetch('/gym/history'),
}

// --- Reading ---

export const readingApi = {
  get: (date: string) => apiFetch(`/reading/${date}`),
  put: (date: string, body: unknown) =>
    apiFetch(`/reading/${date}`, { method: 'PUT', body: JSON.stringify(body) }),
  history: () => apiFetch('/reading/history'),
}

// --- Calendar ---

export const calendarApi = {
  getMonth: (month: string) => apiFetch(`/calendar?month=${month}`),
}

// --- Media ---

export const mediaApi = {
  // Returns { key, uploadUrl } — then PUT the file to uploadUrl
  getUploadUrl: () => apiFetch('/media/upload-url', { method: 'POST' }),

  // Upload raw file to the URL returned above
  uploadFile: (uploadUrl: string, file: File) =>
    fetch(uploadUrl, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    }),

  deleteMedia: (id: string) => apiFetch(`/media/${id}`, { method: 'DELETE' }),
}

// --- Audio ---

export const audioApi = {
  transcribe: (audioBlob: Blob, filename = 'recording.webm') => {
    const fd = new FormData()
    fd.append('audio', audioBlob, filename)
    return fetch('/api/audio/transcribe', {
      method: 'POST',
      credentials: 'include',
      body: fd,
    })
  },
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
  exportData: () => fetch('/api/settings/export', { credentials: 'include' }),
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
  me: () => apiFetch('/spotify/me'),
  disconnect: () => fetch('/api/spotify/disconnect', { credentials: 'include' }),
}

// --- Auth ---

export const authApi = {
  me: () => apiFetch('/auth/me'),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
}
