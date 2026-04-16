import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { gymApi } from '../api'
import { useAutoSave } from '../hooks/useAutoSave'
import { useAutoGrow } from '../hooks/useAutoGrow'
import DateHeader, { todayISO } from '../components/DateHeader'
import SaveIndicator from '../components/SaveIndicator'
import styles from './Gym.module.css'

const SESSION_TYPES = ['Push', 'Pull', 'Legs', 'Arms', 'Cardio'] as const
const REST_TYPE = 'Rest' as const
type SessionType = (typeof SESSION_TYPES)[number] | typeof REST_TYPE

interface GymData {
  session_type: string
  notes: string | null
}

export default function Gym() {
  const { date: dateParam } = useParams<{ date?: string }>()
  const dateStr = !dateParam || dateParam === 'today' ? todayISO() : dateParam

  const [loading, setLoading] = useState(true)
  const [sessionType, setSessionType] = useState<SessionType | null>(null)
  const [notes, setNotes] = useState('')
  const ready = useRef(false)

  const { ref: textareaRef, resize } = useAutoGrow(notes)

  useEffect(() => {
    setLoading(true)
    ready.current = false
    gymApi.get(dateStr).then(async (r) => {
      if (r.ok) {
        const data = await r.json() as GymData | null
        if (data) {
          setSessionType((data.session_type as SessionType) ?? null)
          setNotes(data.notes ?? '')
        } else {
          setSessionType(null)
          setNotes('')
        }
      }
      setLoading(false)
      ready.current = true
    })
  }, [dateStr])

  const saveFn = useCallback(async (data: GymData) => {
    await gymApi.put(dateStr, data)
  }, [dateStr])

  const { save, status } = useAutoSave(saveFn, 1000)

  function persist(overrides: Partial<GymData> = {}) {
    if (!ready.current) return
    const type = overrides.session_type ?? sessionType
    if (!type) return
    save({ session_type: type, notes: notes, ...overrides })
  }

  function handleSessionType(type: SessionType) {
    setSessionType(type)
    persist({ session_type: type })
  }

  function handleNotes(v: string) {
    setNotes(v)
    persist({ notes: v })
  }

  if (loading) {
    return (
      <div className="sb-page">
        <div className="sb-page-inner">
          <div style={{
            height: 200,
            background: 'var(--c-surface)',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--c-border)',
          }} />
        </div>
      </div>
    )
  }

  return (
    <div className="sb-page">
      <div className="sb-page-inner">
        <SaveIndicator status={status} />

        <DateHeader dateStr={dateStr} className={styles.dateHeader} />

        {/* Session type selector */}
        <div className={styles.section}>
          <div className="sb-section-label">Session type</div>
          <div className="sb-pill-group">
            {SESSION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className="sb-pill"
                data-selected={String(sessionType === type)}
                onClick={() => handleSessionType(type)}
              >
                {type}
              </button>
            ))}
            <button
              type="button"
              className="sb-pill"
              data-muted="true"
              data-selected={String(sessionType === REST_TYPE)}
              onClick={() => handleSessionType(REST_TYPE)}
            >
              {REST_TYPE}
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className={styles.section}>
          <div className="sb-section-label">Notes</div>
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => handleNotes(e.target.value)}
            onInput={resize}
            placeholder="How did the session go?"
            className="sb-textarea"
          />
        </div>

        <div className="sb-divider" />

        {/* Coming soon stub */}
        <div className={styles.section}>
          <div className="sb-coming-soon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Weights &amp; reps tracker — Coming soon</span>
          </div>
        </div>
      </div>
    </div>
  )
}
