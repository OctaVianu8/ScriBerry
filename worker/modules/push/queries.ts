import type { D1Database } from '@cloudflare/workers-types'

export async function getSubscriptionsByUserId(db: D1Database, userId: string) {
  return db
    .prepare('SELECT * FROM push_subscriptions WHERE user_id = ?')
    .bind(userId)
    .all()
}

export async function saveSubscription(
  db: D1Database,
  id: string,
  userId: string,
  subscription: string,
) {
  return db
    .prepare(
      'INSERT INTO push_subscriptions (id, user_id, subscription) VALUES (?, ?, ?)',
    )
    .bind(id, userId, subscription)
    .run()
}

export async function deleteSubscription(db: D1Database, userId: string) {
  return db
    .prepare('DELETE FROM push_subscriptions WHERE user_id = ?')
    .bind(userId)
    .run()
}
