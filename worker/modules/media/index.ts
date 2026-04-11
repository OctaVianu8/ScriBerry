import type { Env } from '../../index'
import { getImageByUrlAndUser } from './queries'

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

  // GET /api/media/file/:uuid — serve image from R2
  // Key format in R2: userId/uuid  (organized by user)
  // URL uses only the uuid — no path encoding issues
  const fileMatch = pathname.match(/^\/api\/media\/file\/([0-9a-f-]+)$/)
  if (fileMatch && method === 'GET') {
    const uuid = fileMatch[1]
    const r2_url = `/api/media/file/${uuid}`

    // Verify ownership via DB before serving
    const owned = await getImageByUrlAndUser(env.scriberry_db, r2_url, userId)
    if (!owned) return json({ error: 'Forbidden' }, 403)

    // Reconstruct the R2 key: userId/uuid
    const r2Key = `${userId}/${uuid}`
    const object = await env.scriberry_media.get(r2Key)
    if (!object) return new Response('Not found', { status: 404 })

    // Read the full body as ArrayBuffer — more reliable than streaming object.body
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
