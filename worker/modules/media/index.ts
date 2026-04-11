import type { Env } from '../../index'

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export async function handleMedia(
  request: Request,
  env: Env,
  userId: string,
): Promise<Response> {
  const { pathname, method } = new URL(request.url)

  // GET /api/media/file/:userId/:uuid — serve image from R2
  //
  // The R2 key is identical to the URL suffix after /api/media/file/.
  // Example: /api/media/file/abc-user-id/def-image-uuid
  //          → R2 key = "abc-user-id/def-image-uuid"
  //
  // Auth: the key must start with the authenticated user's id.
  // No DB lookup needed — ownership is encoded in the path.
  const fileMatch = pathname.match(/^\/api\/media\/file\/(.+)$/)
  if (fileMatch && method === 'GET') {
    const r2Key = fileMatch[1]

    if (!r2Key.startsWith(`${userId}/`)) {
      return json({ error: 'Forbidden' }, 403)
    }

    const object = await env.scriberry_media.get(r2Key)
    if (!object) return new Response('Not found', { status: 404 })

    const body = await object.arrayBuffer()
    const contentType = object.httpMetadata?.contentType ?? 'application/octet-stream'

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=86400',
      },
    })
  }

  // POST /api/audio/transcribe — Workers AI Whisper
  if (pathname === '/api/audio/transcribe' && method === 'POST') {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    if (!audioFile) return json({ error: 'Missing audio field' }, 400)

    const arrayBuffer = await audioFile.arrayBuffer()
    const result = (await env.AI.run('@cf/openai/whisper', {
      audio: [...new Uint8Array(arrayBuffer)],
    })) as { text: string }

    return json({ transcript: result.text ?? '' })
  }

  return new Response('Not found', { status: 404 })
}
