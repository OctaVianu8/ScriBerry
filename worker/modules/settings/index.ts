import type { Env } from '../../index'

export async function handleSettings(request: Request, _env: Env, _userId: string): Promise<Response> {
  // TODO: implement settings routes
  // GET /api/settings
  // PUT /api/settings
  return new Response(JSON.stringify({ todo: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
