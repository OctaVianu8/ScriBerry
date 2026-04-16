import type { Env } from '../../index'
import { getSessionByDate, upsertSession, getHistory } from './queries'

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export async function handleGym(
  request: Request,
  env: Env,
  userId: string,
): Promise<Response> {
  const url = new URL(request.url)
  const { pathname } = url
  const { method } = request

  // GET /api/gym/history
  if (pathname === '/api/gym/history' && method === 'GET') {
    const dates = await getHistory(env.scriberry_db, userId)
    return json(dates)
  }

  // /api/gym/:date
  const dateMatch = pathname.match(/^\/api\/gym\/(\d{4}-\d{2}-\d{2})$/)
  if (dateMatch) {
    const date = dateMatch[1]

    if (method === 'GET') {
      const session = await getSessionByDate(env.scriberry_db, userId, date)
      return json(session ?? null)
    }

    if (method === 'PUT') {
      const body = (await request.json()) as {
        session_type?: string
        notes?: string | null
      }
      if (!body.session_type) {
        return json({ error: 'session_type is required' }, 400)
      }
      await upsertSession(
        env.scriberry_db,
        crypto.randomUUID(),
        userId,
        date,
        body.session_type,
        body.notes ?? null,
      )
      const session = await getSessionByDate(env.scriberry_db, userId, date)
      return json(session)
    }
  }

  return new Response('Not found', { status: 404 })
}
