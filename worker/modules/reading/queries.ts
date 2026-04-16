import type { D1Database } from '@cloudflare/workers-types'

export interface ReadingLog {
  id: string
  user_id: string
  date: string
  book_title: string | null
  notes: string | null
  created_at: string
}

export async function getLogByDate(
  db: D1Database,
  userId: string,
  date: string,
): Promise<ReadingLog | null> {
  return db
    .prepare('SELECT * FROM reading_logs WHERE user_id = ? AND date = ?')
    .bind(userId, date)
    .first<ReadingLog>()
}

export async function upsertLog(
  db: D1Database,
  id: string,
  userId: string,
  date: string,
  bookTitle: string | null,
  notes: string | null,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO reading_logs (id, user_id, date, book_title, notes)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, date) DO UPDATE SET
         book_title = excluded.book_title,
         notes = excluded.notes`,
    )
    .bind(id, userId, date, bookTitle ?? null, notes ?? null)
    .run()
}

export async function getHistory(
  db: D1Database,
  userId: string,
): Promise<{ date: string; book_title: string | null }[]> {
  const result = await db
    .prepare(
      `SELECT date, book_title FROM reading_logs
       WHERE user_id = ? AND date >= date('now', '-90 days')
       ORDER BY date DESC`,
    )
    .bind(userId)
    .all<{ date: string; book_title: string | null }>()
  return result.results
}
