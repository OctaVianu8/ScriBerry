import type { D1Database } from '@cloudflare/workers-types'

export interface Settings {
  user_id: string
  theme: string
  accent_color: string
  font_size: string
  reduce_motion: number
  default_page: string
  auto_save_delay: number
  editor_line_height: string
  spell_check: number
  week_start_day: string
  show_empty_days: number
  notifications_enabled: number
  notification_time: string
  notification_sound: number
  gym_weekly_goal: number
  show_streaks: number
  spotify_username: string | null
  spotify_avatar_url: string | null
  spotify_auto_fetch: number
  display_name: string | null
  language: string
}

const DEFAULTS: Omit<Settings, 'user_id'> = {
  theme: 'dark',
  accent_color: '#4f8ef7',
  font_size: 'medium',
  reduce_motion: 0,
  default_page: 'journal',
  auto_save_delay: 1000,
  editor_line_height: 'comfortable',
  spell_check: 1,
  week_start_day: 'monday',
  show_empty_days: 0,
  notifications_enabled: 0,
  notification_time: '21:00',
  notification_sound: 1,
  gym_weekly_goal: 3,
  show_streaks: 1,
  spotify_username: null,
  spotify_avatar_url: null,
  spotify_auto_fetch: 1,
  display_name: null,
  language: 'en',
}

// Columns that the frontend can update (excludes spotify tokens)
const UPDATABLE_COLS = [
  'theme', 'accent_color', 'font_size', 'reduce_motion',
  'default_page', 'auto_save_delay', 'editor_line_height', 'spell_check',
  'week_start_day', 'show_empty_days',
  'notifications_enabled', 'notification_time', 'notification_sound',
  'gym_weekly_goal', 'show_streaks', 'spotify_auto_fetch',
  'display_name', 'language',
] as const

export async function getSettings(
  db: D1Database,
  userId: string,
): Promise<Settings> {
  const row = await db
    .prepare('SELECT * FROM settings WHERE user_id = ?')
    .bind(userId)
    .first<Settings>()
  if (row) return row
  return { user_id: userId, ...DEFAULTS }
}

export async function upsertSettings(
  db: D1Database,
  userId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  // Filter to only allowed columns
  const updates: [string, unknown][] = []
  for (const col of UPDATABLE_COLS) {
    if (col in fields) updates.push([col, fields[col]])
  }
  if (updates.length === 0) return

  // Build dynamic upsert
  const allCols = ['user_id', ...updates.map(([c]) => c)]
  const placeholders = allCols.map(() => '?').join(', ')
  const conflictSet = updates.map(([c]) => `${c} = excluded.${c}`).join(', ')

  await db
    .prepare(
      `INSERT INTO settings (${allCols.join(', ')}) VALUES (${placeholders})
       ON CONFLICT(user_id) DO UPDATE SET ${conflictSet}`,
    )
    .bind(userId, ...updates.map(([, v]) => v))
    .run()
}

export async function getAllUserData(
  db: D1Database,
  userId: string,
): Promise<{
  journal_entries: unknown[]
  gym_sessions: unknown[]
  reading_logs: unknown[]
  settings: Settings
}> {
  const [journal, gym, reading, settings] = await Promise.all([
    db.prepare('SELECT * FROM journal_entries WHERE user_id = ? ORDER BY date DESC')
      .bind(userId).all(),
    db.prepare('SELECT * FROM gym_sessions WHERE user_id = ? ORDER BY date DESC')
      .bind(userId).all(),
    db.prepare('SELECT * FROM reading_logs WHERE user_id = ? ORDER BY date DESC')
      .bind(userId).all(),
    getSettings(db, userId),
  ])
  return {
    journal_entries: journal.results,
    gym_sessions: gym.results,
    reading_logs: reading.results,
    settings,
  }
}
