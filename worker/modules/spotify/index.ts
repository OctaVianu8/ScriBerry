// ---------------------------------------------------------------------------
// Spotify integration for Scriberry
// ---------------------------------------------------------------------------
// Setup:
// 1. Go to https://developer.spotify.com/dashboard
// 2. Create an app
// 3. Add redirect URI: https://scriberry.octavian-stanescu.com/api/spotify/callback
// 4. Copy Client ID to wrangler.toml SPOTIFY_CLIENT_ID
// 5. Copy Client Secret: npx wrangler secret put SPOTIFY_CLIENT_SECRET
// ---------------------------------------------------------------------------

import type { Env } from '../../index'
import type { D1Database } from '@cloudflare/workers-types'

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_API = 'https://api.spotify.com/v1'
const SCOPES = 'user-read-recently-played user-top-read user-read-currently-playing'
const REDIRECT_PATH = '/api/spotify/callback'

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

interface TokenRow {
  spotify_access_token: string | null
  spotify_refresh_token: string | null
  spotify_token_expires_at: string | null
}

async function getTokenRow(db: D1Database, userId: string): Promise<TokenRow | null> {
  return db
    .prepare(
      'SELECT spotify_access_token, spotify_refresh_token, spotify_token_expires_at FROM settings WHERE user_id = ?',
    )
    .bind(userId)
    .first<TokenRow>()
}

async function saveTokens(
  db: D1Database,
  userId: string,
  accessToken: string,
  refreshToken: string | null,
  expiresIn: number,
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
  // Use upsert to handle both new and existing rows
  const sets = ['spotify_access_token = ?', 'spotify_token_expires_at = ?']
  const vals: unknown[] = [accessToken, expiresAt]
  if (refreshToken) {
    sets.push('spotify_refresh_token = ?')
    vals.push(refreshToken)
  }
  await db
    .prepare(
      `INSERT INTO settings (user_id, spotify_access_token, spotify_refresh_token, spotify_token_expires_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET ${sets.join(', ')}`,
    )
    .bind(userId, accessToken, refreshToken, expiresAt, ...vals)
    .run()
}

async function refreshSpotifyToken(
  db: D1Database,
  userId: string,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  const row = await getTokenRow(db, userId)
  if (!row?.spotify_refresh_token) return null

  // Check if token is still valid (with 60s buffer)
  if (row.spotify_access_token && row.spotify_token_expires_at) {
    const expiresAt = new Date(row.spotify_token_expires_at).getTime()
    if (Date.now() < expiresAt - 60_000) {
      return row.spotify_access_token
    }
  }

  // Refresh the token
  const resp = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: row.spotify_refresh_token,
    }),
  })

  if (!resp.ok) return null

  const data = (await resp.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }

  await saveTokens(db, userId, data.access_token, data.refresh_token ?? null, data.expires_in)
  return data.access_token
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function handleSpotify(
  request: Request,
  env: Env,
  userId: string,
): Promise<Response> {
  const url = new URL(request.url)
  const { pathname } = url
  const { method } = request

  // ── GET /api/spotify/auth — initiate OAuth ───────────────
  if (pathname === '/api/spotify/auth' && method === 'GET') {
    const state = crypto.randomUUID()
    const redirectUri = `${env.APP_URL}${REDIRECT_PATH}`
    const authUrl = new URL(SPOTIFY_AUTH_URL)
    authUrl.searchParams.set('client_id', env.SPOTIFY_CLIENT_ID)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', SCOPES)
    authUrl.searchParams.set('state', state)

    return new Response(null, {
      status: 302,
      headers: {
        Location: authUrl.toString(),
        'Set-Cookie': `spotify_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
      },
    })
  }

  // ── GET /api/spotify/callback — exchange code ────────────
  if (pathname === '/api/spotify/callback' && method === 'GET') {
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error || !code) {
      return Response.redirect(`${env.APP_URL}/settings?spotify=error`, 302)
    }

    // Verify state
    const cookies = request.headers.get('Cookie') ?? ''
    const stateMatch = cookies.match(/spotify_oauth_state=([^;]+)/)
    if (!stateMatch || stateMatch[1] !== state) {
      return Response.redirect(`${env.APP_URL}/settings?spotify=error`, 302)
    }

    const redirectUri = `${env.APP_URL}${REDIRECT_PATH}`
    const tokenResp = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResp.ok) {
      return Response.redirect(`${env.APP_URL}/settings?spotify=error`, 302)
    }

    const tokenData = (await tokenResp.json()) as {
      access_token: string
      refresh_token: string
      expires_in: number
    }

    await saveTokens(
      env.scriberry_db,
      userId,
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in,
    )

    // Fetch Spotify profile to store username/avatar
    const profileResp = await fetch(`${SPOTIFY_API}/me`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    if (profileResp.ok) {
      const profile = (await profileResp.json()) as {
        display_name?: string
        images?: { url: string }[]
      }
      await env.scriberry_db
        .prepare(
          `UPDATE settings SET spotify_username = ?, spotify_avatar_url = ? WHERE user_id = ?`,
        )
        .bind(
          profile.display_name ?? null,
          profile.images?.[0]?.url ?? null,
          userId,
        )
        .run()
    }

    // Clear state cookie
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${env.APP_URL}/settings?spotify=connected`,
        'Set-Cookie': `spotify_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
      },
    })
  }

  // ── GET /api/spotify/disconnect ──────────────────────────
  if (pathname === '/api/spotify/disconnect' && method === 'GET') {
    await env.scriberry_db
      .prepare(
        `UPDATE settings SET
           spotify_access_token = NULL,
           spotify_refresh_token = NULL,
           spotify_token_expires_at = NULL,
           spotify_username = NULL,
           spotify_avatar_url = NULL
         WHERE user_id = ?`,
      )
      .bind(userId)
      .run()
    return Response.redirect(`${env.APP_URL}/settings?spotify=disconnected`, 302)
  }

  // ── GET /api/spotify/me — current Spotify profile ────────
  if (pathname === '/api/spotify/me' && method === 'GET') {
    const token = await refreshSpotifyToken(
      env.scriberry_db,
      userId,
      env.SPOTIFY_CLIENT_ID,
      env.SPOTIFY_CLIENT_SECRET,
    )
    if (!token) return json({ error: 'Not connected' }, 403)

    const resp = await fetch(`${SPOTIFY_API}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!resp.ok) return json({ error: 'Spotify API error' }, 502)

    const profile = (await resp.json()) as {
      display_name?: string
      images?: { url: string }[]
      id: string
    }
    return json({
      username: profile.display_name ?? profile.id,
      avatar_url: profile.images?.[0]?.url ?? null,
    })
  }

  // ── GET /api/spotify/top-track?date=YYYY-MM-DD ───────────
  if (pathname === '/api/spotify/top-track' && method === 'GET') {
    const date = url.searchParams.get('date')
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json({ error: 'date param required (YYYY-MM-DD)' }, 400)
    }

    const token = await refreshSpotifyToken(
      env.scriberry_db,
      userId,
      env.SPOTIFY_CLIENT_ID,
      env.SPOTIFY_CLIENT_SECRET,
    )
    if (!token) return json({ error: 'Spotify not connected' }, 403)

    // Fetch recently played tracks
    // Use after/before timestamps to scope to the requested date
    const dayStart = new Date(`${date}T00:00:00Z`).getTime()
    const dayEnd = new Date(`${date}T23:59:59Z`).getTime()

    const recentResp = await fetch(
      `${SPOTIFY_API}/me/player/recently-played?limit=50&after=${dayStart}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    if (!recentResp.ok) {
      return json({ error: 'Spotify API error' }, 502)
    }

    const recentData = (await recentResp.json()) as {
      items: {
        track: {
          name: string
          artists: { name: string }[]
          external_urls: { spotify: string }
          album: { images: { url: string }[] }
        }
        played_at: string
      }[]
    }

    // Filter to tracks played on the requested date
    const dayTracks = recentData.items.filter((item) => {
      const playedMs = new Date(item.played_at).getTime()
      return playedMs >= dayStart && playedMs <= dayEnd
    })

    if (dayTracks.length === 0) {
      return json({ error: 'No tracks found for this date' }, 404)
    }

    // Find most frequently played track, or most recent if no repeats
    const counts = new Map<string, { count: number; track: (typeof dayTracks)[0]['track'] }>()
    for (const item of dayTracks) {
      const key = `${item.track.name}::${item.track.artists[0]?.name}`
      const entry = counts.get(key)
      if (entry) {
        entry.count++
      } else {
        counts.set(key, { count: 1, track: item.track })
      }
    }

    let best = dayTracks[0].track
    let bestCount = 0
    for (const [, v] of counts) {
      if (v.count > bestCount) {
        bestCount = v.count
        best = v.track
      }
    }

    return json({
      song_title: best.name,
      song_artist: best.artists.map((a) => a.name).join(', '),
      song_url: best.external_urls.spotify,
      album_art_url: best.album.images[0]?.url ?? null,
    })
  }

  return new Response('Not found', { status: 404 })
}
