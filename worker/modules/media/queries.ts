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

/**
 * Returns the image row if the given r2_url belongs to this user.
 * Used to authorise the GET /api/media/file/:key endpoint without
 * embedding the userId in the R2 key.
 */
export async function getImageByUrlAndUser(
  db: D1Database,
  r2_url: string,
  userId: string,
): Promise<{ id: string } | null> {
  return db
    .prepare(
      `SELECT ji.id
       FROM journal_images ji
       JOIN journal_entries je ON ji.entry_id = je.id
       WHERE je.user_id = ? AND ji.r2_url = ?`,
    )
    .bind(userId, r2_url)
    .first<{ id: string }>()
}
