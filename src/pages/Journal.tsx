import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Editor } from '@tiptap/react'
import { journalApi } from '../api'
import { useAutoSave } from '../hooks/useAutoSave'
import RichEditor from '../components/RichEditor'
import ImageUploader from '../components/ImageUploader'
import AudioRecorder from '../components/AudioRecorder'
import DateHeader, { todayISO } from '../components/DateHeader'
import SaveIndicator from '../components/SaveIndicator'
import styles from './Journal.module.css'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EntryData {
  title: string
  content: string
  highlight: string
  song_title: string
  song_artist: string
  song_url: string
}

interface JournalImage {
  id: string
  r2_url: string
  caption: string | null
}

function SongField({
  title, artist,
  onTitleChange, onArtistChange,
}: {
  title: string
  artist: string
  onTitleChange: (v: string) => void
  onArtistChange: (v: string) => void
}) {
  return (
    <div className="sb-song-row">
      {/* Music note icon */}
      <svg className="sb-song-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>

      <input
        type="text"
        value={title}
        onChange={e => onTitleChange(e.target.value)}
        placeholder="Song of the day"
        className="sb-song-input"
        style={{ flex: '1 1 0', minWidth: 0 }}
      />

      {title && (
        <>
          <span className="sb-song-sep">–</span>
          <input
            type="text"
            value={artist}
            onChange={e => onArtistChange(e.target.value)}
            placeholder="Artist"
            className="sb-song-input"
            style={{ flex: '0 1 110px', minWidth: 0 }}
          />
        </>
      )}
    </div>
  )
}

function HighlightField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="sb-highlight-wrap">
      <div className="sb-highlight-label">Today's highlight</div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="One sentence that captures today…"
        rows={2}
        className="sb-highlight-input"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Journal() {
  const { date: dateParam } = useParams<{ date?: string }>()
  const dateStr = !dateParam || dateParam === 'today' ? todayISO() : dateParam

  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [highlight, setHighlight] = useState('')
  const [songTitle, setSongTitle] = useState('')
  const [songArtist, setSongArtist] = useState('')
  const [images, setImages] = useState<JournalImage[]>([])
  const editorRef = useRef<Editor | null>(null)
  const ready = useRef(false)

  // Load entry + images whenever the date changes
  useEffect(() => {
    setLoading(true)
    ready.current = false

    Promise.all([
      journalApi.get(dateStr).then(r => (r.ok ? r.json() : null)),
      journalApi.getImages(dateStr).then(r => (r.ok ? r.json() : [])),
    ]).then(([entry, imgs]) => {
      const e = entry as {
        title?: string; content?: string; highlight?: string
        song_title?: string; song_artist?: string
      } | null

      setTitle(e?.title ?? '')
      setContent(e?.content ?? '')
      setHighlight(e?.highlight ?? '')
      setSongTitle(e?.song_title ?? '')
      setSongArtist(e?.song_artist ?? '')
      setImages((imgs as JournalImage[]) ?? [])
      setLoading(false)
      ready.current = true
    })
  }, [dateStr])

  // Auto-save
  const saveFn = useCallback(async (data: EntryData) => {
    await journalApi.put(dateStr, data)
  }, [dateStr])

  const { save, status } = useAutoSave(saveFn, 1000)

  function persist(overrides: Partial<EntryData> = {}) {
    if (!ready.current) return
    save({ title, content, highlight, song_title: songTitle, song_artist: songArtist, song_url: '', ...overrides })
  }

  // Field handlers
  const handleTitle       = (v: string) => { setTitle(v);       persist({ title: v }) }
  const handleContent     = (v: string) => { setContent(v);     persist({ content: v }) }
  const handleHighlight   = (v: string) => { setHighlight(v);   persist({ highlight: v }) }
  const handleSongTitle   = (v: string) => { setSongTitle(v);   persist({ song_title: v }) }
  const handleSongArtist  = (v: string) => { setSongArtist(v);  persist({ song_artist: v }) }

  // Insert transcript at cursor
  function handleTranscript(text: string) {
    editorRef.current?.chain().focus().insertContent(text + ' ').run()
  }

  return (
    <div className="sb-page">
      <div className="sb-page-inner">
        <SaveIndicator status={status} />

        {/* Date header */}
        <DateHeader dateStr={dateStr} className={styles.dateHeader} />

        {/* Song of the day */}
        <SongField
          title={songTitle}
          artist={songArtist}
          onTitleChange={handleSongTitle}
          onArtistChange={handleSongArtist}
        />

        {/* Entry title */}
        <input
          type="text"
          value={title}
          onChange={e => handleTitle(e.target.value)}
          placeholder="Untitled"
          className={`sb-title-input ${styles.titleInput}`}
        />

        {/* Rich text editor */}
        <div className={styles.editorBlock}>
          {!loading ? (
            <RichEditor
              key={dateStr}
              initialContent={content || null}
              onChange={handleContent}
              onEditorReady={e => { editorRef.current = e }}
              placeholder="Write anything…"
            />
          ) : (
            /* Skeleton height while loading */
            <div style={{
              height: 'calc(var(--toolbar-height) + 280px)',
              background: 'var(--c-surface)',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--c-border)',
            }} />
          )}
        </div>

        <div className="sb-divider" />

        {/* Highlight */}
        <div className={styles.section}>
          <HighlightField value={highlight} onChange={handleHighlight} />
        </div>

        <div className="sb-divider" />

        {/* Images */}
        <div className={styles.section}>
          <ImageUploader date={dateStr} images={images} onImagesChange={setImages} />
        </div>

        {/* Actions row — audio recorder */}
        <div className={styles.actions}>
          <AudioRecorder onTranscript={handleTranscript} />
        </div>
      </div>
    </div>
  )
}
