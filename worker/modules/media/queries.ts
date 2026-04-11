import type { D1Database } from '@cloudflare/workers-types'

export async function getImagesByEntryId(db: D1Database, entryId: string) {
  return db
    .prepare('SELECT * FROM journal_images WHERE entry_id = ?')
    .bind(entryId)
    .all()
}

export async function deleteImageById(db: D1Database, id: string) {
  return db.prepare('DELETE FROM journal_images WHERE id = ?').bind(id).run()
}
