import type { Env } from '../../index'
import {
  getEntryByDate,
  upsertEntry,
  getHistory,
  getImagesByEntryDate,
  getImageById,
  saveJournalImage,
} from './queries'

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export async function handleJournal(
  request: Request,
  env: Env,
  userId: string,
): Promise<Response> {
  const url = new URL(request.url)
  const { pathname } = url
  const { method } = request

  // GET /api/journal/history
  if (pathname === '/api/journal/history' && method === 'GET') {
    const dates = await getHistory(env.scriberry_db, userId)
    return json(dates)
  }

  // /api/journal/:date
  const dateMatch = pathname.match(/^\/api\/journal\/(\d{4}-\d{2}-\d{2})$/)
  if (dateMatch) {
    const date = dateMatch[1]

    if (method === 'GET') {
      const entry = await getEntryByDate(env.scriberry_db, userId, date)
      return json(entry ?? null)
    }

    if (method === 'PUT') {
      const body = (await request.json()) as {
        title?: string | null
        content?: string | null
        highlight?: string | null
        song_title?: string | null
        song_artist?: string | null
        song_url?: string | null
      }
      await upsertEntry(env.scriberry_db, crypto.randomUUID(), userId, date, body)
      const entry = await getEntryByDate(env.scriberry_db, userId, date)
      return json(entry)
    }
  }

  // /api/journal/:date/images
  const imagesMatch = pathname.match(/^\/api\/journal\/(\d{4}-\d{2}-\d{2})\/images$/)
  if (imagesMatch) {
    const date = imagesMatch[1]

    if (method === 'GET') {
      const images = await getImagesByEntryDate(env.scriberry_db, userId, date)
      return json(images)
    }

    if (method === 'POST') {
      const ct = request.headers.get('Content-Type') ?? ''

      if (!ct.includes('multipart/form-data')) {
        return json({ error: 'Expected multipart/form-data' }, 400)
      }

      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) return json({ error: 'Missing file field' }, 400)

      // Ensure entry exists
      let entry = await getEntryByDate(env.scriberry_db, userId, date)
      if (!entry) {
        await upsertEntry(env.scriberry_db, crypto.randomUUID(), userId, date, {})
        entry = await getEntryByDate(env.scriberry_db, userId, date)
      }
      if (!entry) return json({ error: 'Failed to create entry' }, 500)

      // Use imageId as the R2 key — simple UUID, no prefix, no reconstruction needed.
      // r2_url stored in DB === img src === /api/journal/:date/images/:imageId
      const imageId = crypto.randomUUID()
      const fileType = file.type || 'application/octet-stream'
      try {
        await env.scriberry_media.put(imageId, await file.arrayBuffer(), {
          httpMetadata: { contentType: fileType },
        })
      } catch (e) {
        console.error('R2 upload error:', e)
        return json({ error: 'Failed to store image' }, 500)
      }

      const r2_url = `/api/journal/${date}/images/${imageId}`
      await saveJournalImage(env.scriberry_db, imageId, entry.id, r2_url, undefined)
      return json({ id: imageId, r2_url, caption: null })
    }
  }

  // GET /api/journal/:date/images/:imageId — serve image from R2
  const imageFileMatch = pathname.match(
    /^\/api\/journal\/(\d{4}-\d{2}-\d{2})\/images\/([0-9a-f-]+)$/,
  )
  if (imageFileMatch && method === 'GET') {
    const imageId = imageFileMatch[2]

    // DB ownership check — ensures this image belongs to the authenticated user
    const image = await getImageById(env.scriberry_db, imageId, userId)
    if (!image) return json({ error: 'Not found' }, 404)

    const object = await env.scriberry_media.get(imageId)
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

  return new Response('Not found', { status: 404 })
}
