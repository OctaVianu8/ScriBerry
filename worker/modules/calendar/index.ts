import type { Env } from '../../index'
import { getMonthActivity } from './queries'

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export async function handleCalendar(
  request: Request,
  env: Env,
  userId: string,
): Promise<Response> {
  const url = new URL(request.url)
  const { method } = request

  // GET /api/calendar?month=YYYY-MM
  if (method === 'GET') {
    const month = url.searchParams.get('month')
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return json({ error: 'month query param required (YYYY-MM)' }, 400)
    }
    const days = await getMonthActivity(env.scriberry_db, userId, month)
    return json(days)
  }

  return new Response('Not found', { status: 404 })
}
