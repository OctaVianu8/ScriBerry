import type { D1Database } from '@cloudflare/workers-types'

export async function getSettingsByUserId(db: D1Database, userId: string) {
  return db
    .prepare('SELECT * FROM settings WHERE user_id = ?')
    .bind(userId)
    .first()
}

export async function upsertSettings(
  db: D1Database,
  userId: string,
  fields: Record<string, unknown>,
) {
  // TODO: implement upsert
  void db; void userId; void fields
}
