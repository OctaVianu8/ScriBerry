import { useCallback, useEffect, useState } from 'react'
import { settingsApi } from '../api'
import { useAuth } from '../hooks/useAuth'
import SegmentedControl from '../components/SegmentedControl'
import styles from './Settings.module.css'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserSettings {
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

const ACCENT_COLORS = [
  { value: '#4f8ef7', label: 'Blue' },
  { value: '#e8973f', label: 'Amber' },
  { value: '#5cb85c', label: 'Green' },
  { value: '#e05c8c', label: 'Rose' },
  { value: '#9b6dd7', label: 'Purple' },
  { value: '#4fc3f7', label: 'Cyan' },
]

// ---------------------------------------------------------------------------
// Toggle component
// ---------------------------------------------------------------------------

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className={styles.toggle}
      data-on={String(on)}
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
    >
      <span className={styles.toggleKnob} />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Settings page
// ---------------------------------------------------------------------------

export default function Settings() {
  const { user, logout } = useAuth()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearInput, setClearInput] = useState('')

  useEffect(() => {
    settingsApi.get()
      .then(r => r.ok ? r.json() : null)
      .then((data: UserSettings | null) => {
        if (data) setSettings(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Handle Spotify OAuth redirect params
    const params = new URLSearchParams(window.location.search)
    const spotifyStatus = params.get('spotify')
    if (spotifyStatus === 'connected') {
      // Refresh settings to pick up newly connected Spotify account
      settingsApi.get()
        .then(r => r.ok ? r.json() : null)
        .then((data: UserSettings | null) => {
          if (data) setSettings(data)
        })
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (spotifyStatus) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const update = useCallback((patch: Partial<UserSettings>) => {
    setSettings(prev => prev ? { ...prev, ...patch } : prev)
    settingsApi.put(patch)

    // Apply accent color immediately
    if (patch.accent_color) {
      document.documentElement.style.setProperty('--c-accent', patch.accent_color)
      document.documentElement.style.setProperty('--c-accent-dim', patch.accent_color + '26')
      document.documentElement.style.setProperty('--c-accent-border', patch.accent_color + '66')
    }
  }, [])

  async function handleExport() {
    const r = await settingsApi.exportData()
    if (!r.ok) return
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'scriberry-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleClearData() {
    if (clearInput !== 'DELETE') return
    // TODO: implement DELETE /api/settings/clear endpoint
    setConfirmClear(false)
    setClearInput('')
  }

  if (loading || !settings || !user) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div style={{ height: 200, background: 'var(--c-surface)', borderRadius: 'var(--r-md)', border: '1px solid var(--c-border)' }} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.pageTitle}>Settings</h1>

        {/* ── Profile ──────────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Profile</div>
          <div className={styles.profileRow}>
            <div className={styles.avatar}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name ?? 'User'} />
              ) : (
                (user.name ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
              )}
            </div>
            <div className={styles.profileInfo}>
              <div className={styles.profileName}>{user.name ?? 'Unknown'}</div>
              <div className={styles.profileEmail}>{user.email}</div>
            </div>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Display name</span>
            <input
              type="text"
              className={styles.textInput}
              value={settings.display_name ?? ''}
              onChange={e => update({ display_name: e.target.value || null })}
              placeholder={user.name ?? 'Name'}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Email</span>
            <span className={styles.rowValue}>{user.email}</span>
          </div>
          <div className={styles.row}>
            <span />
            <button type="button" className={styles.btnDanger} onClick={logout}>
              Sign out
            </button>
          </div>
        </div>

        {/* ── Appearance ───────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Appearance</div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Theme</span>
            <SegmentedControl
              options={[
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
                { value: 'system', label: 'System' },
              ]}
              value={settings.theme}
              onChange={v => update({ theme: v })}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Accent color</span>
            <div className={styles.swatches}>
              {ACCENT_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  className={styles.swatch}
                  style={{ background: c.value }}
                  data-selected={String(settings.accent_color === c.value)}
                  onClick={() => update({ accent_color: c.value })}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Font size</span>
            <SegmentedControl
              options={[
                { value: 'small', label: 'S' },
                { value: 'medium', label: 'M' },
                { value: 'large', label: 'L' },
              ]}
              value={settings.font_size}
              onChange={v => update({ font_size: v })}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Reduce motion</span>
            <Toggle on={!!settings.reduce_motion} onChange={v => update({ reduce_motion: v ? 1 : 0 })} />
          </div>
        </div>

        {/* ── Writing ──────────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Writing</div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Default page</span>
            <SegmentedControl
              options={[
                { value: 'journal', label: 'Journal' },
                { value: 'gym', label: 'Gym' },
                { value: 'reading', label: 'Reading' },
              ]}
              value={settings.default_page}
              onChange={v => update({ default_page: v })}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Auto-save delay</span>
            <SegmentedControl
              options={[
                { value: '500', label: '0.5s' },
                { value: '1000', label: '1s' },
                { value: '2000', label: '2s' },
              ]}
              value={String(settings.auto_save_delay)}
              onChange={v => update({ auto_save_delay: Number(v) })}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Line height</span>
            <SegmentedControl
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'comfortable', label: 'Comfort' },
                { value: 'spacious', label: 'Spacious' },
              ]}
              value={settings.editor_line_height}
              onChange={v => update({ editor_line_height: v })}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Spell check</span>
            <Toggle on={!!settings.spell_check} onChange={v => update({ spell_check: v ? 1 : 0 })} />
          </div>
        </div>

        {/* ── Calendar ─────────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Calendar</div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Week starts on</span>
            <SegmentedControl
              options={[
                { value: 'monday', label: 'Monday' },
                { value: 'sunday', label: 'Sunday' },
              ]}
              value={settings.week_start_day}
              onChange={v => update({ week_start_day: v })}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Show empty days in sidebar</span>
            <Toggle on={!!settings.show_empty_days} onChange={v => update({ show_empty_days: v ? 1 : 0 })} />
          </div>
        </div>

        {/* ── Notifications ────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Notifications</div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Push notifications</span>
            <Toggle
              on={!!settings.notifications_enabled}
              onChange={async (v) => {
                if (v && 'Notification' in window) {
                  const perm = await Notification.requestPermission()
                  if (perm !== 'granted') return
                }
                update({ notifications_enabled: v ? 1 : 0 })
              }}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Reminder time</span>
            <input
              type="time"
              className={styles.timeInput}
              value={settings.notification_time}
              onChange={e => update({ notification_time: e.target.value })}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Sound</span>
            <Toggle on={!!settings.notification_sound} onChange={v => update({ notification_sound: v ? 1 : 0 })} />
          </div>
        </div>

        {/* ── Streaks & Goals ──────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Streaks &amp; Goals</div>
          <div className={styles.row}>
            <div>
              <div className={styles.rowLabel}>Gym weekly goal</div>
              <div className={styles.rowSub}>Min sessions/week for streak</div>
            </div>
            <input
              type="number"
              className={styles.numberInput}
              value={settings.gym_weekly_goal}
              min={1}
              max={7}
              onChange={e => {
                const v = Math.min(7, Math.max(1, Number(e.target.value) || 1))
                update({ gym_weekly_goal: v })
              }}
            />
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Show streaks in sidebar</span>
            <Toggle on={!!settings.show_streaks} onChange={v => update({ show_streaks: v ? 1 : 0 })} />
          </div>
        </div>

        {/* ── Spotify ──────────────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Spotify</div>
          {settings.spotify_username ? (
            <>
              <div className={styles.row}>
                <span className={styles.rowLabel}>Connected as {settings.spotify_username}</span>
                <button type="button" className={styles.btn} onClick={() => { window.location.href = '/api/spotify/disconnect' }}>
                  Disconnect
                </button>
              </div>
              <div className={styles.row}>
                <span className={styles.rowLabel}>Auto-fetch song of the day</span>
                <Toggle on={!!settings.spotify_auto_fetch} onChange={v => update({ spotify_auto_fetch: v ? 1 : 0 })} />
              </div>
            </>
          ) : (
            <div className={styles.row}>
              <span className={styles.rowLabel}>Connect your Spotify account</span>
              <button type="button" className={styles.btn} onClick={() => { window.location.href = '/api/spotify/auth' }}>
                Connect
              </button>
            </div>
          )}
        </div>

        {/* ── Data & Privacy ───────────────────────────────── */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Data &amp; Privacy</div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Export all data</span>
            <button type="button" className={styles.btn} onClick={handleExport}>
              Download JSON
            </button>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Clear all data</span>
            <button type="button" className={styles.btnDanger} onClick={() => setConfirmClear(true)}>
              Clear data
            </button>
          </div>
        </div>

        {/* ── About ────────────────────────────────────────── */}
        <div className={styles.about}>
          <div>Scriberry v0.1.0</div>
          <div>Made with ☕ during Erasmus</div>
        </div>
      </div>

      {/* ── Clear data confirmation dialog ─────────────────── */}
      {confirmClear && (
        <div className={styles.confirmBackdrop} onClick={() => setConfirmClear(false)}>
          <div className={styles.confirmDialog} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmTitle}>Clear all data?</div>
            <div className={styles.confirmText}>
              This will permanently delete all your journal entries, gym sessions, and reading logs. This action cannot be undone.
            </div>
            <input
              type="text"
              className={styles.confirmInput}
              placeholder='Type "DELETE" to confirm'
              value={clearInput}
              onChange={e => setClearInput(e.target.value)}
              autoFocus
            />
            <div className={styles.confirmActions}>
              <button type="button" className={styles.btn} onClick={() => { setConfirmClear(false); setClearInput('') }}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                disabled={clearInput !== 'DELETE'}
                onClick={handleClearData}
                style={clearInput !== 'DELETE' ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
              >
                Delete everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
