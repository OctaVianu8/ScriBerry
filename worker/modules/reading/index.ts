import type { Env } from '../../index'

export async function handleReading(request: Request, _env: Env, _userId: string): Promise<Response> {
  // TODO: implement reading routes
  // GET /api/reading/:date
  // PUT /api/reading/:date
  return new Response(JSON.stringify({ todo: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
