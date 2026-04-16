import { handleAuth, getAuthenticatedUserId } from './modules/auth'
import { handleJournal } from './modules/journal'
import { handleGym } from './modules/gym'
import { handleReading } from './modules/reading'
import { handleCalendar } from './modules/calendar'
import { handleMedia } from './modules/media'
import { handlePush } from './modules/push'
import { handleSettings } from './modules/settings'
import { sendScheduledNotifications } from './cron/notifications'
import type { D1Database, R2Bucket } from '@cloudflare/workers-types'

export interface Env {
  // Bindings — names must match Cloudflare Pages settings exactly
  scriberry_db: D1Database
  scriberry_media: R2Bucket
  // Workers AI binding — add "AI" in Pages → Functions → Workers AI Bindings
  AI: { run(model: string, input: Record<string, unknown>): Promise<unknown> }
  // Pages assets binding — automatically provided by Cloudflare Pages
  ASSETS: { fetch(request: Request): Promise<Response> }

  // Vars / secrets
  ENVIRONMENT: string
  APP_URL: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  APPLE_CLIENT_ID: string
  APPLE_TEAM_ID: string
  APPLE_KEY_ID: string
  APPLE_PRIVATE_KEY: string
}

const json401 = () =>
  new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

    // /api/auth/* is public — OAuth flows and session endpoints
    if (pathname.startsWith('/api/auth')) return handleAuth(request, env)

    // All other /api/* routes require a valid session
    if (pathname.startsWith('/api/')) {
      const userId = await getAuthenticatedUserId(request, env)
      if (!userId) return json401()

      if (pathname.startsWith('/api/journal')) return handleJournal(request, env, userId)
      if (pathname.startsWith('/api/gym')) return handleGym(request, env, userId)
      if (pathname.startsWith('/api/reading')) return handleReading(request, env, userId)
      if (pathname.startsWith('/api/calendar')) return handleCalendar(request, env, userId)
      if (pathname.startsWith('/api/media')) return handleMedia(request, env, userId)
      if (pathname.startsWith('/api/audio')) return handleMedia(request, env, userId)
      if (pathname.startsWith('/api/push')) return handlePush(request, env, userId)
      if (pathname.startsWith('/api/settings')) return handleSettings(request, env, userId)

      return new Response('Not found', { status: 404 })
    }

    // All non-API requests are served from the Pages static asset build
    return env.ASSETS.fetch(request)
  },

  async scheduled(_event: { scheduledTime: number }, env: Env): Promise<void> {
    await sendScheduledNotifications(env)
  },
}
