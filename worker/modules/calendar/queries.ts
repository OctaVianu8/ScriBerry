import type { D1Database } from '@cloudflare/workers-types'

export interface CalendarDay {
  date: string
  journal: boolean
  gym: boolean
  reading: boolean
}

/**
 * Returns all days in the given month (YYYY-MM) that have at least one entry,
 * with flags indicating which activities exist.
 */
export async function getMonthActivity(
  db: D1Database,
  userId: string,
  month: string, // YYYY-MM
): Promise<CalendarDay[]> {
  const startDate = `${month}-01`
  // Last day: go to next month minus 1 day
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`

  const result = await db
    .prepare(
      `SELECT
         dates.date,
         CASE WHEN je.id IS NOT NULL THEN 1 ELSE 0 END AS journal,
         CASE WHEN gs.id IS NOT NULL THEN 1 ELSE 0 END AS gym,
         CASE WHEN rl.id IS NOT NULL THEN 1 ELSE 0 END AS reading
       FROM (
         SELECT DISTINCT date FROM (
           SELECT date FROM journal_entries WHERE user_id = ? AND date BETWEEN ? AND ?
           UNION
           SELECT date FROM gym_sessions WHERE user_id = ? AND date BETWEEN ? AND ?
           UNION
           SELECT date FROM reading_logs WHERE user_id = ? AND date BETWEEN ? AND ?
         )
       ) dates
       LEFT JOIN journal_entries je ON je.user_id = ? AND je.date = dates.date
       LEFT JOIN gym_sessions gs ON gs.user_id = ? AND gs.date = dates.date
       LEFT JOIN reading_logs rl ON rl.user_id = ? AND rl.date = dates.date
       ORDER BY dates.date ASC`,
    )
    .bind(
      userId, startDate, endDate,
      userId, startDate, endDate,
      userId, startDate, endDate,
      userId,
      userId,
      userId,
    )
    .all<{ date: string; journal: number; gym: number; reading: number }>()

  return result.results.map((row) => ({
    date: row.date,
    journal: row.journal === 1,
    gym: row.gym === 1,
    reading: row.reading === 1,
  }))
}
