import type { Env } from '../../index'
import { getLogByDate, upsertLog, getHistory } from './queries'

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export async function handleReading(
  request: Request,
  env: Env,
  userId: string,
): Promise<Response> {
  const url = new URL(request.url)
  const { pathname } = url
  const { method } = request

  // GET /api/reading/history
  if (pathname === '/api/reading/history' && method === 'GET') {
    const dates = await getHistory(env.scriberry_db, userId)
    return json(dates)
  }

  // /api/reading/:date
  const dateMatch = pathname.match(/^\/api\/reading\/(\d{4}-\d{2}-\d{2})$/)
  if (dateMatch) {
    const date = dateMatch[1]

    if (method === 'GET') {
      const log = await getLogByDate(env.scriberry_db, userId, date)
      return json(log ?? null)
    }

    if (method === 'PUT') {
      const body = (await request.json()) as {
        book_title?: string | null
        notes?: string | null
      }
      await upsertLog(
        env.scriberry_db,
        crypto.randomUUID(),
        userId,
        date,
        body.book_title ?? null,
        body.notes ?? null,
      )
      const log = await getLogByDate(env.scriberry_db, userId, date)
      return json(log)
    }
  }

  return new Response('Not found', { status: 404 })
}
