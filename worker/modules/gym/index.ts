import type { Env } from '../../index'

export async function handleGym(request: Request, _env: Env, _userId: string): Promise<Response> {
  // TODO: implement gym routes
  // GET /api/gym/:date
  // PUT /api/gym/:date
  return new Response(JSON.stringify({ todo: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
