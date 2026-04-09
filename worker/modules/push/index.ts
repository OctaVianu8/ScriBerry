import type { Env } from '../../index'

export async function handlePush(request: Request, _env: Env, _userId: string): Promise<Response> {
  // TODO: implement push routes
  // POST /api/push/subscribe    → save push subscription
  // DELETE /api/push/subscribe  → remove push subscription
  return new Response(JSON.stringify({ todo: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
