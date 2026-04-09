import type { Env } from '../../index'

export async function handleMedia(request: Request, _env: Env, _userId: string): Promise<Response> {
  // TODO: implement media routes
  // POST /api/media/upload-url  → generate signed R2 upload URL
  // DELETE /api/media/:id       → delete from R2 and DB
  return new Response(JSON.stringify({ todo: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
