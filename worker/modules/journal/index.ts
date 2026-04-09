import type { Env } from '../../index'

export async function handleJournal(request: Request, _env: Env, _userId: string): Promise<Response> {
  // TODO: implement journal routes
  // GET /api/journal/:date
  // PUT /api/journal/:date
  // GET /api/journal/history
  return new Response(JSON.stringify({ todo: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
