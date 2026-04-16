import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { calendarApi } from '../api'
import styles from './Calendar.module.css'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarDay {
  date: string
  journal: boolean
  gym: boolean
  reading: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function monthISO(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function formatMonth(year: number, month: number) {
  const d = new Date(year, month - 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/** Build array of day cells for the calendar grid, including padding days from prev/next months. */
function buildGridDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1)
  // Week starts Monday (0=Mon..6=Sun)
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const daysInMonth = new Date(year, month, 0).getDate()

  // Previous month padding
  const prevMonthDays = new Date(year, month - 1, 0).getDate()
  const cells: { date: string; day: number; outside: boolean }[] = []

  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const pm = month === 1 ? 12 : month - 1
    const py = month === 1 ? year - 1 : year
    cells.push({ date: `${py}-${String(pm).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, outside: true })
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, outside: false })
  }

  // Next month padding (fill to complete last row)
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const nm = month === 12 ? 1 : month + 1
      const ny = month === 12 ? year + 1 : year
      cells.push({ date: `${ny}-${String(nm).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, outside: true })
    }
  }

  return cells
}

function isWeekend(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay()
  return dow === 0 || dow === 6
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ---------------------------------------------------------------------------
// Calendar page
// ---------------------------------------------------------------------------

export default function Calendar() {
  const navigate = useNavigate()
  const today = todayISO()
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [activity, setActivity] = useState<Map<string, CalendarDay>>(new Map())
  const [loading, setLoading] = useState(true)
  const [openDay, setOpenDay] = useState<string | null>(null)

  const fetchMonth = useCallback((y: number, m: number) => {
    setLoading(true)
    calendarApi.getMonth(monthISO(y, m))
      .then(r => r.ok ? r.json() : [])
      .then((days: CalendarDay[]) => {
        const map = new Map<string, CalendarDay>()
        for (const d of days) map.set(d.date, d)
        setActivity(map)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchMonth(year, month)
  }, [year, month, fetchMonth])

  function prevMonth() {
    setOpenDay(null)
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    setOpenDay(null)
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  function handleDayClick(dateStr: string, hasContent: boolean) {
    if (!hasContent) return
    setOpenDay(prev => prev === dateStr ? null : dateStr)
  }

  function handlePopoverNav(path: string) {
    setOpenDay(null)
    navigate(path)
  }

  const cells = buildGridDays(year, month)
  const isFuture = (dateStr: string) => dateStr > today

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Month header */}
        <div className={styles.monthHeader}>
          <button className={styles.navArrow} onClick={prevMonth} aria-label="Previous month">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className={styles.monthLabel}>{formatMonth(year, month)}</span>
          <button className={styles.navArrow} onClick={nextMonth} aria-label="Next month">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Day-of-week labels */}
        <div className={styles.grid}>
          {DAY_LABELS.map((label, i) => (
            <div
              key={label}
              className={styles.dayLabel}
              data-weekend={String(i >= 5)}
            >
              {label}
            </div>
          ))}

          {/* Day cells */}
          {cells.map((cell) => {
            const data = activity.get(cell.date)
            const hasContent = !!data
            const future = isFuture(cell.date)
            const isInteractive = !cell.outside && !future && hasContent
            const isToday = cell.date === today

            return (
              <div
                key={cell.date}
                className={styles.cell}
                data-outside={String(cell.outside)}
                data-today={String(isToday)}
                data-has-content={String(hasContent)}
                data-interactive={String(isInteractive)}
                data-weekend={String(isWeekend(cell.date))}
                onClick={() => isInteractive && handleDayClick(cell.date, hasContent)}
                style={future && !cell.outside ? { opacity: 0.35, pointerEvents: 'none' } : undefined}
              >
                <span className={styles.dayNumber}>{cell.day}</span>
                {hasContent && !cell.outside && (
                  <div className={styles.dots}>
                    {data!.journal && <span className={styles.actDot} data-type="journal" />}
                    {data!.gym && <span className={styles.actDot} data-type="gym" />}
                    {data!.reading && <span className={styles.actDot} data-type="reading" />}
                  </div>
                )}

                {/* Popover */}
                {openDay === cell.date && data && (
                  <div className={styles.popover}>
                    {data.journal && (
                      <div
                        className={styles.popoverLink}
                        onClick={(e) => { e.stopPropagation(); handlePopoverNav(`/journal/${cell.date}`) }}
                      >
                        <span className={styles.popoverDot} style={{ background: 'var(--c-accent)' }} />
                        Open Journal
                      </div>
                    )}
                    {data.gym && (
                      <div
                        className={styles.popoverLink}
                        onClick={(e) => { e.stopPropagation(); handlePopoverNav(`/gym/${cell.date}`) }}
                      >
                        <span className={styles.popoverDot} style={{ background: 'var(--c-success)' }} />
                        Open Gym
                      </div>
                    )}
                    {data.reading && (
                      <div
                        className={styles.popoverLink}
                        onClick={(e) => { e.stopPropagation(); handlePopoverNav(`/reading/${cell.date}`) }}
                      >
                        <span className={styles.popoverDot} style={{ background: '#e8973f' }} />
                        Open Reading
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Loading overlay */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: 'var(--sp-4)',
            color: 'var(--c-text-3)',
            fontFamily: 'var(--f-ui)',
            fontSize: 'var(--t-xs)',
          }}>
            Loading…
          </div>
        )}
      </div>

      {/* Backdrop for closing popover on tap outside */}
      {openDay && (
        <div className={styles.popoverBackdrop} onClick={() => setOpenDay(null)} />
      )}
    </div>
  )
}
