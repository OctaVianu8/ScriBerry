import type { D1Database } from '@cloudflare/workers-types'

export async function getLogByDate(db: D1Database, userId: string, date: string) {
  return db
    .prepare('SELECT * FROM reading_logs WHERE user_id = ? AND date = ?')
    .bind(userId, date)
    .first()
}

export async function upsertLog(
  db: D1Database,
  id: string,
  userId: string,
  date: string,
  bookTitle: string,
  notes: string,
) {
  // TODO: implement upsert
  void db; void id; void userId; void date; void bookTitle; void notes
}
