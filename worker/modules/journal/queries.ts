import type { D1Database } from '@cloudflare/workers-types'

export interface JournalEntry {
  id: string
  user_id: string
  date: string
  title: string | null
  content: string | null
  highlight: string | null
  song_title: string | null
  song_artist: string | null
  song_url: string | null
  created_at: string
  updated_at: string
}

export interface JournalImage {
  id: string
  r2_url: string
  caption: string | null
}

export async function getEntryByDate(
  db: D1Database,
  userId: string,
  date: string,
): Promise<JournalEntry | null> {
  return db
    .prepare('SELECT * FROM journal_entries WHERE user_id = ? AND date = ?')
    .bind(userId, date)
    .first<JournalEntry>()
}

export async function upsertEntry(
  db: D1Database,
  id: string,
  userId: string,
  date: string,
  fields: {
    title?: string | null
    content?: string | null
    highlight?: string | null
    song_title?: string | null
    song_artist?: string | null
    song_url?: string | null
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO journal_entries (id, user_id, date, title, content, highlight, song_title, song_artist, song_url, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, date) DO UPDATE SET
         title = excluded.title,
         content = excluded.content,
         highlight = excluded.highlight,
         song_title = excluded.song_title,
         song_artist = excluded.song_artist,
         song_url = excluded.song_url,
         updated_at = datetime('now')`,
    )
    .bind(
      id,
      userId,
      date,
      fields.title ?? null,
      fields.content ?? null,
      fields.highlight ?? null,
      fields.song_title ?? null,
      fields.song_artist ?? null,
      fields.song_url ?? null,
    )
    .run()
}

export async function getHistory(
  db: D1Database,
  userId: string,
): Promise<{ date: string }[]> {
  const result = await db
    .prepare(
      `SELECT date FROM journal_entries
       WHERE user_id = ? AND date >= date('now', '-90 days')
       ORDER BY date DESC`,
    )
    .bind(userId)
    .all<{ date: string }>()
  return result.results
}

export async function getImagesByEntryDate(
  db: D1Database,
  userId: string,
  date: string,
): Promise<JournalImage[]> {
  const result = await db
    .prepare(
      `SELECT ji.id, ji.r2_url, ji.caption
       FROM journal_images ji
       JOIN journal_entries je ON ji.entry_id = je.id
       WHERE je.user_id = ? AND je.date = ?
       ORDER BY ji.created_at ASC`,
    )
    .bind(userId, date)
    .all<JournalImage>()
  return result.results
}

export async function getImageById(
  db: D1Database,
  imageId: string,
  userId: string,
): Promise<JournalImage | null> {
  return db
    .prepare(
      `SELECT ji.id, ji.r2_url, ji.caption
       FROM journal_images ji
       JOIN journal_entries je ON ji.entry_id = je.id
       WHERE ji.id = ? AND je.user_id = ?`,
    )
    .bind(imageId, userId)
    .first<JournalImage>()
}

export async function saveJournalImage(
  db: D1Database,
  id: string,
  entryId: string,
  r2Url: string,
  caption?: string,
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO journal_images (id, entry_id, r2_url, caption) VALUES (?, ?, ?, ?)',
    )
    .bind(id, entryId, r2Url, caption ?? null)
    .run()
}
