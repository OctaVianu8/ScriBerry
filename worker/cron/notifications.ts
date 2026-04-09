import type { Env } from '../index'

export async function sendScheduledNotifications(_env: Env): Promise<void> {
  // TODO: implement scheduled push notification logic
  // 1. Query all users with push subscriptions
  // 2. For each user, check if current UTC time matches their notification_time setting
  // 3. Send Web Push notification: "Don't forget to write in your journal today 📓"
  // 4. On click → opens /journal/today
}
