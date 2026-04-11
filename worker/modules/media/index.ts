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
