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

  // POST /api/media/upload-url — allocate a key; client will PUT the file
  if (pathname === '/api/media/upload-url' && method === 'POST') {
    const key = `${userId}/${crypto.randomUUID()}`
    return json({ key, uploadUrl: `/api/media/upload/${encodeURIComponent(key)}` })
  }

  // PUT /api/media/upload/:key — stream file body into R2
  const uploadMatch = pathname.match(/^\/api\/media\/upload\/(.+)$/)
  if (uploadMatch && method === 'PUT') {
    const key = decodeURIComponent(uploadMatch[1])
    if (!key.startsWith(`${userId}/`)) return json({ error: 'Forbidden' }, 403)
    const contentType = request.headers.get('Content-Type') ?? 'application/octet-stream'
    await env.scriberry_media.put(key, request.body, {
      httpMetadata: { contentType },
    })
    return json({ url: `/api/media/file/${encodeURIComponent(key)}` })
  }

  // GET /api/media/file/:key — serve from R2 (session-authenticated via DB lookup)
  const fileMatch = pathname.match(/^\/api\/media\/file\/([^/]+)$/)
  if (fileMatch && method === 'GET') {
    const key = fileMatch[1]
    const r2_url = `/api/media/file/${key}`
    // Verify the image belongs to this user via the DB
    const owned = await getImageByUrlAndUser(env.scriberry_db, r2_url, userId)
    if (!owned) return json({ error: 'Forbidden' }, 403)
    const object = await env.scriberry_media.get(key)
    if (!object) return new Response('Not found', { status: 404 })
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('Cache-Control', 'private, max-age=31536000, immutable')
    return new Response(object.body, { headers })
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
