import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import type { AuthUser } from '../context/AuthContext'
import { journalApi } from '../api'
import styles from './Sidebar.module.css'

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const icons = {
  collapse: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  expand: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  close: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  journal: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  gym: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h1a4 4 0 0 0 0 8H2" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="6" y1="8" x2="6" y2="16" />
      <line x1="18" y1="8" x2="18" y2="16" />
    </svg>
  ),
  reading: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  highlights: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  group: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SidebarProps {
  expanded: boolean
  isMobile: boolean
  onToggle: () => void
  onClose: () => void
  user: AuthUser
}

interface HistoryDay {
  date: string        // YYYY-MM-DD
  hasJournal: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function lastNDays(n: number): string[] {
  const days: string[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return days
}

function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

// ---------------------------------------------------------------------------
// Main Sidebar component
// ---------------------------------------------------------------------------

export default function Sidebar({ expanded, isMobile, onToggle, onClose, user }: SidebarProps) {
  const navigate = useNavigate()
  const [history, setHistory] = useState<HistoryDay[]>([])
  const today = todayISO()
  const days = lastNDays(7)

  // Fetch journal history to populate dots
  useEffect(() => {
    if (!expanded) return // don't fetch if collapsed/closed
    journalApi.history()
      .then(r => r.ok ? r.json() : [])
      .then((data: { date: string }[]) => {
        const dateSet = new Set(data.map(d => d.date))
        setHistory(days.map(d => ({ date: d, hasJournal: dateSet.has(d) })))
      })
      .catch(() => {
        setHistory(days.map(d => ({ date: d, hasJournal: false })))
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  const toggleIcon = isMobile
    ? icons.close
    : expanded ? icons.collapse : icons.expand

  return (
    <aside
      className={styles.sidebar}
      data-expanded={String(expanded)}
      aria-label="Navigation"
    >
      {/* Top: toggle + app name */}
      <div className={styles.top}>
        <button
          className={styles.toggleBtn}
          onClick={isMobile ? onClose : onToggle}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {toggleIcon}
        </button>
        {expanded && (
          <span className={styles.appName}>
            Scriberry<span className={styles.berryDot} />
          </span>
        )}
      </div>

      {/* Scrollable content */}
      <div className={styles.scrollArea}>
        {/* Primary nav */}
        <nav className={styles.navSection}>
          <SideNavItem to="/journal/today"  icon={icons.journal}    label="Journal"    expanded={expanded} />
          <SideNavItem to="/gym/today"      icon={icons.gym}        label="Gym"        expanded={expanded} />
          <SideNavItem to="/reading/today"  icon={icons.reading}    label="Reading"    expanded={expanded} />
          <SideNavItem to="/calendar"       icon={icons.calendar}   label="Calendar"   expanded={expanded} />
          <SideNavItem to="/highlights"     icon={icons.highlights} label="Highlights" expanded={expanded} />
          <SideNavItem to="/group"          icon={icons.group}      label="Group"      expanded={expanded} disabled tag="Soon" />
        </nav>

        {/* History — only when expanded */}
        {expanded && (
          <>
            <div className={styles.divider} />
            <div className={styles.historySection}>
              <div className={styles.sectionLabel}>Recent</div>
              {history.map(day => (
                <div
                  key={day.date}
                  className={styles.historyItem}
                  onClick={() => navigate(`/journal/${day.date}`)}
                >
                  <span
                    className={styles.historyDate}
                    data-today={String(day.date === today)}
                  >
                    {day.date === today ? 'Today' : shortDate(day.date)}
                  </span>
                  <span className={styles.historyDots}>
                    {/* Journal dot */}
                    <span className={styles.dot} data-filled={String(day.hasJournal)} />
                    {/* Gym + Reading — always gray for now */}
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                  </span>
                </div>
              ))}
            </div>

            {/* Streak counters */}
            <div className={styles.divider} />
            <div className={styles.streaks}>
              <span className={styles.streak}>📓 <span className={styles.streakCount}>—</span></span>
              <span className={styles.streak}>🏋️ <span className={styles.streakCount}>—</span></span>
              <span className={styles.streak}>📚 <span className={styles.streakCount}>—</span></span>
            </div>
          </>
        )}
      </div>

      {/* Footer: user row */}
      <div className={styles.footer}>
        <div
          className={styles.userRow}
          onClick={() => navigate('/settings')}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && navigate('/settings')}
          title={!expanded ? user.name ?? 'Settings' : undefined}
        >
          <div className={styles.avatar}>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name ?? 'User'} />
            ) : (
              initials(user.name)
            )}
          </div>
          {expanded && (
            <span className={styles.userName}>{user.name ?? user.email}</span>
          )}
        </div>
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Internal NavLink wrapper with proper active state
// ---------------------------------------------------------------------------

function SideNavItem({
  to, icon, label, expanded, disabled = false, tag,
}: {
  to: string
  icon: React.ReactNode
  label: string
  expanded: boolean
  disabled?: boolean
  tag?: string
}) {
  if (disabled) {
    return (
      <div
        className={styles.navItem}
        data-disabled="true"
        title={!expanded ? label : undefined}
      >
        <span className={styles.navIcon}>{icon}</span>
        {expanded && (
          <>
            <span className={styles.navLabel}>{label}</span>
            {tag && <span className={styles.comingSoon}>{tag}</span>}
          </>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={to}
      title={!expanded ? label : undefined}
      style={{ all: 'unset', display: 'block' }}
    >
      {({ isActive }) => (
        <div
          className={styles.navItem}
          data-active={String(isActive)}
        >
          <span className={styles.navIcon}>{icon}</span>
          {expanded && <span className={styles.navLabel}>{label}</span>}
        </div>
      )}
    </NavLink>
  )
}
