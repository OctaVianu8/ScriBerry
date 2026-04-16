import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { readingApi } from '../api'
import { useAutoSave } from '../hooks/useAutoSave'
import { useAutoGrow } from '../hooks/useAutoGrow'
import DateHeader, { todayISO } from '../components/DateHeader'
import SaveIndicator from '../components/SaveIndicator'
import styles from './Reading.module.css'

interface ReadingData {
  book_title: string | null
  notes: string | null
}

export default function Reading() {
  const { date: dateParam } = useParams<{ date?: string }>()
  const dateStr = !dateParam || dateParam === 'today' ? todayISO() : dateParam

  const [loading, setLoading] = useState(true)
  const [bookTitle, setBookTitle] = useState('')
  const [notes, setNotes] = useState('')
  const ready = useRef(false)

  const { ref: textareaRef, resize } = useAutoGrow(notes)

  useEffect(() => {
    setLoading(true)
    ready.current = false
    readingApi.get(dateStr).then(async (r) => {
      if (r.ok) {
        const data = await r.json() as ReadingData | null
        if (data) {
          setBookTitle(data.book_title ?? '')
          setNotes(data.notes ?? '')
        } else {
          setBookTitle('')
          setNotes('')
        }
      }
      setLoading(false)
      ready.current = true
    })
  }, [dateStr])

  const saveFn = useCallback(async (data: ReadingData) => {
    await readingApi.put(dateStr, data)
  }, [dateStr])

  const { save, status } = useAutoSave(saveFn, 1000)

  function persist(overrides: Partial<ReadingData> = {}) {
    if (!ready.current) return
    save({ book_title: bookTitle || null, notes: notes || null, ...overrides })
  }

  function handleBookTitle(v: string) {
    setBookTitle(v)
    persist({ book_title: v || null })
  }

  function handleNotes(v: string) {
    setNotes(v)
    persist({ notes: v || null })
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

        {/* Book title */}
        <div className={styles.section}>
          <input
            type="text"
            value={bookTitle}
            onChange={(e) => handleBookTitle(e.target.value)}
            placeholder="What are you reading?"
            className="sb-title-input"
          />
        </div>

        {/* Notes */}
        <div className={styles.section}>
          <div className="sb-section-label">Notes</div>
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => handleNotes(e.target.value)}
            onInput={resize}
            placeholder="What did you read today?"
            className="sb-textarea"
          />
        </div>
      </div>
    </div>
  )
}
