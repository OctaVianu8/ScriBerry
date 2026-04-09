import type { D1Database } from '@cloudflare/workers-types'

export async function getEntryByDate(db: D1Database, userId: string, date: string) {
  return db
    .prepare('SELECT * FROM journal_entries WHERE user_id = ? AND date = ?')
    .bind(userId, date)
    .first()
}

export async function upsertEntry(
  db: D1Database,
  id: string,
  userId: string,
  date: string,
  fields: Record<string, unknown>,
) {
  // TODO: implement upsert
  void db; void id; void userId; void date; void fields
}

export async function getHistory(db: D1Database, userId: string, days = 90) {
  return db
    .prepare(
      `SELECT date FROM journal_entries WHERE user_id = ? ORDER BY date DESC LIMIT ?`,
    )
    .bind(userId, days)
    .all()
}
