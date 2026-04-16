import type { Env } from '../../index'
import { getSettings, upsertSettings, getAllUserData } from './queries'

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export async function handleSettings(
  request: Request,
  env: Env,
  userId: string,
): Promise<Response> {
  const url = new URL(request.url)
  const { pathname } = url
  const { method } = request

  // GET /api/settings
  if (pathname === '/api/settings' && method === 'GET') {
    const settings = await getSettings(env.scriberry_db, userId)
    return json(settings)
  }

  // PUT /api/settings — partial update
  if (pathname === '/api/settings' && method === 'PUT') {
    const body = (await request.json()) as Record<string, unknown>
    await upsertSettings(env.scriberry_db, userId, body)
    const settings = await getSettings(env.scriberry_db, userId)
    return json(settings)
  }

  // GET /api/settings/export — export all user data as JSON
  if (pathname === '/api/settings/export' && method === 'GET') {
    const data = await getAllUserData(env.scriberry_db, userId)
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="scriberry-export.json"',
      },
    })
  }

  return new Response('Not found', { status: 404 })
}
