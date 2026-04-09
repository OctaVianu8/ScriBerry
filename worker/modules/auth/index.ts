import type { Env } from '../../index'
import {
  getUserByEmail,
  getUserById,
  upsertUserByEmail,
  createSession,
  deleteSession,
  getSessionById,
  type User,
} from './queries'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SESSION_COOKIE = 'sid'
const STATE_COOKIE = 'oauth_state'
const SESSION_DAYS = 30

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

function parseCookies(header: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    result[part.slice(0, eq).trim()] = part.slice(eq + 1).trim()
  }
  return result
}

function sessionCookie(id: string, secure: boolean): string {
  const maxAge = SESSION_DAYS * 86400
  return `${SESSION_COOKIE}=${id}; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${maxAge}; Path=/`
}

function clearSessionCookie(secure: boolean): string {
  return `${SESSION_COOKIE}=; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=Lax; Max-Age=0; Path=/`
}

/** State cookie must survive the Apple POST callback cross-origin redirect. */
function stateCookie(state: string, secure: boolean): string {
  const sameSite = secure ? 'SameSite=None; Secure' : 'SameSite=Lax'
  return `${STATE_COOKIE}=${state}; HttpOnly; ${sameSite}; Max-Age=600; Path=/`
}

function clearStateCookie(secure: boolean): string {
  const sameSite = secure ? 'SameSite=None; Secure' : 'SameSite=Lax'
  return `${STATE_COOKIE}=; HttpOnly; ${sameSite}; Max-Age=0; Path=/`
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

function toSQLiteDate(d: Date): string {
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const u8 = data instanceof Uint8Array ? data : new Uint8Array(data)
  let str = ''
  for (let i = 0; i < u8.length; i++) str += String.fromCharCode(u8[i])
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}

function parseJWTPayload(token: string): Record<string, unknown> {
  const [, payloadB64] = token.split('.')
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)))
}

function parseJWTHeader(token: string): Record<string, string> {
  const [headerB64] = token.split('.')
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64)))
}

/** Make a JSON → base64url encoded JWT segment. */
function jwtSegment(obj: unknown): string {
  return base64UrlEncode(new TextEncoder().encode(JSON.stringify(obj)))
}

// ---------------------------------------------------------------------------
// Session creation helper
// ---------------------------------------------------------------------------

async function createUserSession(
  env: Env,
  email: string,
  name: string,
  avatarUrl: string,
): Promise<string> {
  const newId = crypto.randomUUID()
  await upsertUserByEmail(env.DB, newId, email, name, avatarUrl)
  const user = await getUserByEmail(env.DB, email)
  if (!user) throw new Error('Failed to create or find user')

  const sessionId = crypto.randomUUID()
  const expiresAt = toSQLiteDate(new Date(Date.now() + SESSION_DAYS * 86400 * 1000))
  await createSession(env.DB, sessionId, user.id, expiresAt)
  return sessionId
}

// ---------------------------------------------------------------------------
// Apple Sign In helpers
// ---------------------------------------------------------------------------

async function importApplePrivateKey(pem: string): Promise<CryptoKey> {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'pkcs8',
    der.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
}

/**
 * Generate the Apple client_secret — a short-lived ES256 JWT signed with
 * the P8 private key downloaded from developer.apple.com.
 */
async function createAppleClientSecret(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const headerSeg = jwtSegment({ alg: 'ES256', kid: env.APPLE_KEY_ID })
  const payloadSeg = jwtSegment({
    iss: env.APPLE_TEAM_ID,
    iat: now,
    exp: now + 15_777_000, // ~6 months
    aud: 'https://appleid.apple.com',
    sub: env.APPLE_CLIENT_ID,
  })

  const key = await importApplePrivateKey(env.APPLE_PRIVATE_KEY)
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(`${headerSeg}.${payloadSeg}`),
  )

  return `${headerSeg}.${payloadSeg}.${base64UrlEncode(signature)}`
}

interface AppleJWK {
  kty: string
  kid: string
  use: string
  alg: string
  n: string
  e: string
}

/**
 * Verify Apple's id_token (RS256) against Apple's public JWKS.
 * Returns { sub, email } from the token payload.
 */
async function verifyAppleIdToken(
  idToken: string,
): Promise<{ sub: string; email?: string }> {
  const header = parseJWTHeader(idToken)
  const res = await fetch('https://appleid.apple.com/auth/keys')
  const { keys } = (await res.json()) as { keys: AppleJWK[] }
  const jwk = keys.find(k => k.kid === header.kid)
  if (!jwk) throw new Error('Apple JWKS: no matching key for kid=' + header.kid)

  const publicKey = await crypto.subtle.importKey(
    'jwk',
    jwk as unknown as JsonWebKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  const [headerSeg, payloadSeg, sigSeg] = idToken.split('.')
  const signingInput = new TextEncoder().encode(`${headerSeg}.${payloadSeg}`)
  const signature = base64UrlDecode(sigSeg)

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    signature,
    signingInput,
  )
  if (!valid) throw new Error('Apple id_token signature is invalid')

  const payload = parseJWTPayload(idToken)
  return { sub: payload.sub as string, email: payload.email as string | undefined }
}

// ---------------------------------------------------------------------------
// Google OAuth flow
// ---------------------------------------------------------------------------

async function initiateGoogle(request: Request, env: Env): Promise<Response> {
  const state = crypto.randomUUID()
  const isSecure = new URL(request.url).protocol === 'https:'

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${env.APP_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  })

  const headers = new Headers({
    Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    'Set-Cookie': stateCookie(state, isSecure),
  })

  return new Response(null, { status: 302, headers })
}

async function googleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const isSecure = url.protocol === 'https:'

  // Verify CSRF state
  const cookies = parseCookies(request.headers.get('Cookie') ?? '')
  if (!state || state !== cookies[STATE_COOKIE]) {
    return new Response('Invalid OAuth state', { status: 400 })
  }
  if (!code) return new Response('Missing authorization code', { status: 400 })

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${env.APP_URL}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    console.error('Google token exchange failed:', await tokenRes.text())
    return new Response('OAuth token exchange failed', { status: 502 })
  }

  const { access_token } = (await tokenRes.json()) as { access_token: string }

  // Fetch user profile
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  if (!profileRes.ok) return new Response('Failed to fetch Google profile', { status: 502 })

  const { email, name, picture } = (await profileRes.json()) as {
    email: string
    name: string
    picture: string
  }

  const sessionId = await createUserSession(env, email, name ?? '', picture ?? '')
  const headers = new Headers({
    Location: `${env.APP_URL}/`,
  })
  headers.append('Set-Cookie', sessionCookie(sessionId, isSecure))
  headers.append('Set-Cookie', clearStateCookie(isSecure))

  return new Response(null, { status: 302, headers })
}

// ---------------------------------------------------------------------------
// Apple Sign In flow
// ---------------------------------------------------------------------------

async function initiateApple(request: Request, env: Env): Promise<Response> {
  const state = crypto.randomUUID()
  const isSecure = new URL(request.url).protocol === 'https:'

  const params = new URLSearchParams({
    client_id: env.APPLE_CLIENT_ID,
    redirect_uri: `${env.APP_URL}/api/auth/apple/callback`,
    response_type: 'code id_token',
    response_mode: 'form_post', // Apple sends a POST to the callback
    scope: 'name email',
    state,
  })

  const headers = new Headers({
    Location: `https://appleid.apple.com/auth/authorize?${params}`,
    'Set-Cookie': stateCookie(state, isSecure),
  })

  return new Response(null, { status: 302, headers })
}

/**
 * Apple's callback is a cross-origin POST (response_mode: form_post).
 * Because of the cross-origin POST, SameSite=Lax cookies are not sent,
 * so we use SameSite=None; Secure for the state cookie and accept that
 * state verification only works in production (HTTPS). In dev, we skip it.
 */
async function appleCallback(request: Request, env: Env): Promise<Response> {
  const isSecure = new URL(request.url).protocol === 'https:'
  const formData = await request.formData()

  const code = formData.get('code') as string | null
  const state = formData.get('state') as string | null
  const idToken = formData.get('id_token') as string | null
  // On first sign-in only, Apple includes a JSON `user` field
  const userJson = formData.get('user') as string | null

  if (!code || !idToken) return new Response('Missing code or id_token', { status: 400 })

  // State verification (only in production where SameSite=None cookie works)
  if (isSecure) {
    const cookies = parseCookies(request.headers.get('Cookie') ?? '')
    if (!state || state !== cookies[STATE_COOKIE]) {
      return new Response('Invalid OAuth state', { status: 400 })
    }
  }

  // Verify id_token signature against Apple's JWKS
  let sub: string
  let email: string | undefined
  try {
    ;({ sub, email } = await verifyAppleIdToken(idToken))
  } catch (err) {
    console.error('Apple id_token verification failed:', err)
    return new Response('Apple id_token verification failed', { status: 400 })
  }

  // Extract name — only present on first sign-in
  let name = ''
  if (userJson) {
    try {
      const parsed = JSON.parse(userJson) as {
        name?: { firstName?: string; lastName?: string }
      }
      const { firstName = '', lastName = '' } = parsed.name ?? {}
      name = `${firstName} ${lastName}`.trim()
    } catch {
      // ignore parse errors
    }
  }

  // Fall back to the Apple sub as a display name if email/name are unavailable
  const userEmail = email ?? `${sub}@privaterelay.appleid.com`
  const sessionId = await createUserSession(env, userEmail, name, '')

  // Exchange the code with Apple's token endpoint (required for token validation,
  // even though we already verified the id_token signature above)
  const clientSecret = await createAppleClientSecret(env)
  await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.APPLE_CLIENT_ID,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${env.APP_URL}/api/auth/apple/callback`,
    }),
  }) // result not needed since we already verified id_token

  const headers = new Headers({ Location: `${env.APP_URL}/` })
  headers.append('Set-Cookie', sessionCookie(sessionId, isSecure))
  headers.append('Set-Cookie', clearStateCookie(isSecure))

  return new Response(null, { status: 302, headers })
}

// ---------------------------------------------------------------------------
// Auth middleware (exported for use in worker/index.ts)
// ---------------------------------------------------------------------------

/**
 * Reads the session cookie, validates it against D1, and returns the user ID.
 * Returns null if the request is unauthenticated or the session is expired.
 */
export async function getAuthenticatedUserId(
  request: Request,
  env: Env,
): Promise<string | null> {
  const cookies = parseCookies(request.headers.get('Cookie') ?? '')
  const sessionId = cookies[SESSION_COOKIE]
  if (!sessionId) return null
  const session = await getSessionById(env.DB, sessionId)
  return session?.user_id ?? null
}

/**
 * Like getAuthenticatedUserId but also returns the full user row.
 */
export async function getAuthenticatedUser(
  request: Request,
  env: Env,
): Promise<User | null> {
  const cookies = parseCookies(request.headers.get('Cookie') ?? '')
  const sessionId = cookies[SESSION_COOKIE]
  if (!sessionId) return null
  const session = await getSessionById(env.DB, sessionId)
  if (!session) return null
  return getUserById(env.DB, session.user_id)
}

// ---------------------------------------------------------------------------
// Route handler (exported for worker/index.ts)
// ---------------------------------------------------------------------------

export async function handleAuth(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url)
  const { method } = request

  if (pathname === '/api/auth/google' && method === 'GET') {
    return initiateGoogle(request, env)
  }
  if (pathname === '/api/auth/google/callback' && method === 'GET') {
    return googleCallback(request, env)
  }
  if (pathname === '/api/auth/apple' && method === 'GET') {
    return initiateApple(request, env)
  }
  if (pathname === '/api/auth/apple/callback' && method === 'POST') {
    return appleCallback(request, env)
  }

  if (pathname === '/api/auth/me' && method === 'GET') {
    const user = await getAuthenticatedUser(request, env)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(
      JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    const isSecure = new URL(request.url).protocol === 'https:'
    const cookies = parseCookies(request.headers.get('Cookie') ?? '')
    const sessionId = cookies[SESSION_COOKIE]
    if (sessionId) await deleteSession(env.DB, sessionId)

    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearSessionCookie(isSecure),
      },
    })
  }

  return new Response('Not found', { status: 404 })
}
