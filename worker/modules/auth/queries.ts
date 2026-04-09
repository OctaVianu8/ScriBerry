import type { D1Database } from '@cloudflare/workers-types'

export interface User {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  created_at: string
}

interface Session {
  id: string
  user_id: string
  created_at: string
  expires_at: string
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>()
}

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>()
}

/**
 * Insert the user if email is new, otherwise update name and avatar.
 * The caller must then call getUserByEmail to get the canonical user ID,
 * since an existing user keeps their original ID.
 */
export async function upsertUserByEmail(
  db: D1Database,
  newId: string,
  email: string,
  name: string,
  avatarUrl: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (id, email, name, avatar_url)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         name = excluded.name,
         avatar_url = excluded.avatar_url`,
    )
    .bind(newId, email, name, avatarUrl)
    .run()
}

export async function getSessionById(
  db: D1Database,
  sessionId: string,
): Promise<Session | null> {
  return db
    .prepare(`SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')`)
    .bind(sessionId)
    .first<Session>()
}

export async function createSession(
  db: D1Database,
  sessionId: string,
  userId: string,
  expiresAt: string,
): Promise<void> {
  await db
    .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(sessionId, userId, expiresAt)
    .run()
}

export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run()
}
