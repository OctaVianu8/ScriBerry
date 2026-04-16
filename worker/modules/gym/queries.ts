import type { D1Database } from '@cloudflare/workers-types'

export interface GymSession {
  id: string
  user_id: string
  date: string
  session_type: string
  notes: string | null
  created_at: string
}

export async function getSessionByDate(
  db: D1Database,
  userId: string,
  date: string,
): Promise<GymSession | null> {
  return db
    .prepare('SELECT * FROM gym_sessions WHERE user_id = ? AND date = ?')
    .bind(userId, date)
    .first<GymSession>()
}

export async function upsertSession(
  db: D1Database,
  id: string,
  userId: string,
  date: string,
  sessionType: string,
  notes: string | null,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO gym_sessions (id, user_id, date, session_type, notes)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, date) DO UPDATE SET
         session_type = excluded.session_type,
         notes = excluded.notes`,
    )
    .bind(id, userId, date, sessionType, notes ?? null)
    .run()
}

export async function getHistory(
  db: D1Database,
  userId: string,
): Promise<{ date: string; session_type: string }[]> {
  const result = await db
    .prepare(
      `SELECT date, session_type FROM gym_sessions
       WHERE user_id = ? AND date >= date('now', '-90 days')
       ORDER BY date DESC`,
    )
    .bind(userId)
    .all<{ date: string; session_type: string }>()
  return result.results
}
