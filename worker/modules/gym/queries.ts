import type { D1Database } from '@cloudflare/workers-types'

export async function getSessionByDate(db: D1Database, userId: string, date: string) {
  return db
    .prepare('SELECT * FROM gym_sessions WHERE user_id = ? AND date = ?')
    .bind(userId, date)
    .first()
}

export async function upsertSession(
  db: D1Database,
  id: string,
  userId: string,
  date: string,
  sessionType: string,
  notes: string,
) {
  // TODO: implement upsert
  void db; void id; void userId; void date; void sessionType; void notes
}
