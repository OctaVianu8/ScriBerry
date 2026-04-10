import type { Env } from '../../index'
import {
  getEntryByDate,
  upsertEntry,
  getHistory,
  getImagesByEntryDate,
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
      const { r2_url, caption } = (await request.json()) as {
        r2_url: string
        caption?: string
      }

      // Ensure the entry exists before attaching an image
      let entry = await getEntryByDate(env.scriberry_db, userId, date)
      if (!entry) {
        await upsertEntry(env.scriberry_db, crypto.randomUUID(), userId, date, {})
        entry = await getEntryByDate(env.scriberry_db, userId, date)
      }
      if (!entry) return json({ error: 'Failed to create entry' }, 500)

      const imageId = crypto.randomUUID()
      await saveJournalImage(env.scriberry_db, imageId, entry.id, r2_url, caption)
      return json({ id: imageId, r2_url, caption: caption ?? null })
    }
  }

  return new Response('Not found', { status: 404 })
}
