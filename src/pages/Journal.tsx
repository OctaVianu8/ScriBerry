import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Editor } from '@tiptap/react'
import { journalApi } from '../api'
import { useAutoSave } from '../hooks/useAutoSave'
import RichEditor from '../components/RichEditor'
import ImageUploader from '../components/ImageUploader'
import AudioRecorder from '../components/AudioRecorder'

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatDateHeader(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' })
  const longDate = d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  return { weekday, longDate }
}

// ---------------------------------------------------------------------------
// Saved indicator
// ---------------------------------------------------------------------------

function SavedIndicator({ status }: { status: string }) {
  const visible = status === 'saving' || status === 'saved' || status === 'error'
  const text =
    status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : 'Error saving'
  const color =
    status === 'saving' ? '#4a4540' : status === 'saved' ? '#6b7c5e' : '#8b4a4a'

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 24,
        fontSize: 11,
        letterSpacing: '0.04em',
        color,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {text}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section divider
// ---------------------------------------------------------------------------

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: 'rgba(255,255,255,0.05)',
        margin: '28px 0',
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Song field
// ---------------------------------------------------------------------------

interface SongFieldProps {
  title: string
  artist: string
  onTitleChange: (v: string) => void
  onArtistChange: (v: string) => void
}

function SongField({ title, artist, onTitleChange, onArtistChange }: SongFieldProps) {
  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#7a7068',
    fontSize: 13,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    width: '100%',
    caretColor: '#c9a96e',
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 32,
      }}
    >
      {/* Music note icon */}
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#3a3632"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>

      <input
        type="text"
        value={title}
        onChange={e => onTitleChange(e.target.value)}
        placeholder="Song of the day"
        style={{ ...inputStyle, flex: '1 1 0', minWidth: 0 }}
      />

      {title && (
        <>
          <span style={{ color: '#2a2826', fontSize: 12 }}>–</span>
          <input
            type="text"
            value={artist}
            onChange={e => onArtistChange(e.target.value)}
            placeholder="Artist"
            style={{ ...inputStyle, flex: '0 1 120px', minWidth: 0 }}
          />
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Highlight field
// ---------------------------------------------------------------------------

interface HighlightFieldProps {
  value: string
  onChange: (v: string) => void
}

function HighlightField({ value, onChange }: HighlightFieldProps) {
  return (
    <div
      style={{
        position: 'relative',
        marginTop: 4,
      }}
    >
      {/* Label */}
      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#4a3e2e',
          marginBottom: 10,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        Today's highlight
      </div>

      {/* Pull-quote callout */}
      <div
        style={{
          display: 'flex',
          gap: 14,
          padding: '14px 16px',
          borderRadius: 8,
          background: 'rgba(201,169,110,0.05)',
          border: '1px solid rgba(201,169,110,0.1)',
          borderLeft: '3px solid rgba(201,169,110,0.4)',
        }}
      >
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="One sentence that captures today…"
          rows={2}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            color: '#c4a87a',
            fontSize: 15,
            lineHeight: 1.6,
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontStyle: 'italic',
            caretColor: '#c9a96e',
          }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Journal() {
  const { date: dateParam } = useParams<{ date?: string }>()
  const dateStr = dateParam === 'today' || !dateParam ? todayISO() : dateParam
  const { weekday, longDate } = formatDateHeader(dateStr)

  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [highlight, setHighlight] = useState('')
  const [songTitle, setSongTitle] = useState('')
  const [songArtist, setSongArtist] = useState('')
  const [images, setImages] = useState<JournalImage[]>([])
  const editorRef = useRef<Editor | null>(null)
  const initialised = useRef(false)

  // ---- Load entry on mount / date change ----
  useEffect(() => {
    setLoading(true)
    initialised.current = false

    Promise.all([
      journalApi.get(dateStr).then(r => (r.ok ? r.json() : null)),
      journalApi.getImages(dateStr).then(r => (r.ok ? r.json() : [])),
    ]).then(([entry, imgs]) => {
      const e = entry as {
        title?: string
        content?: string
        highlight?: string
        song_title?: string
        song_artist?: string
      } | null

      setTitle(e?.title ?? '')
      setContent(e?.content ?? '')
      setHighlight(e?.highlight ?? '')
      setSongTitle(e?.song_title ?? '')
      setSongArtist(e?.song_artist ?? '')
      setImages((imgs as JournalImage[]) ?? [])
      setLoading(false)
      initialised.current = true
    })
  }, [dateStr])

  // ---- Auto-save ----
  const saveFn = useCallback(
    async (data: EntryData) => {
      await journalApi.put(dateStr, data)
    },
    [dateStr],
  )

  const { save, status } = useAutoSave(saveFn, 1000)

  function triggerSave(overrides: Partial<EntryData> = {}) {
    if (!initialised.current) return
    save({
      title,
      content,
      highlight,
      song_title: songTitle,
      song_artist: songArtist,
      song_url: '',
      ...overrides,
    })
  }

  // ---- Field change handlers ----
  function handleTitleChange(v: string) {
    setTitle(v)
    triggerSave({ title: v })
  }
  function handleContentChange(v: string) {
    setContent(v)
    triggerSave({ content: v })
  }
  function handleHighlightChange(v: string) {
    setHighlight(v)
    triggerSave({ highlight: v })
  }
  function handleSongTitleChange(v: string) {
    setSongTitle(v)
    triggerSave({ song_title: v })
  }
  function handleSongArtistChange(v: string) {
    setSongArtist(v)
    triggerSave({ song_artist: v })
  }

  // ---- Insert audio transcript at cursor ----
  function handleTranscript(text: string) {
    const editor = editorRef.current
    if (editor) {
      editor.chain().focus().insertContent(text + ' ').run()
    }
  }

  // ---- Layout ----
  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#0a0a0a',
    paddingBottom: 120, // space for mobile toolbar
  }

  const innerStyle: React.CSSProperties = {
    maxWidth: 720,
    margin: '0 auto',
    padding: '48px 28px 80px',
  }

  return (
    <div style={pageStyle}>
      <div style={innerStyle}>
        <SavedIndicator status={status} />

        {/* ---- Date header ---- */}
        <header style={{ marginBottom: 36 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#3a3632',
              marginBottom: 6,
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            {weekday}
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 300,
              color: '#c8c0b4',
              letterSpacing: '-0.5px',
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
          >
            {longDate}
          </h1>
        </header>

        {/* ---- Song of the day ---- */}
        <SongField
          title={songTitle}
          artist={songArtist}
          onTitleChange={handleSongTitleChange}
          onArtistChange={handleSongArtistChange}
        />

        {/* ---- Title input ---- */}
        <input
          type="text"
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Title (optional)"
          style={{
            display: 'block',
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 22,
            fontWeight: 600,
            color: '#e8e3d5',
            fontFamily: 'Georgia, "Times New Roman", serif',
            letterSpacing: '-0.3px',
            marginBottom: 20,
            caretColor: '#c9a96e',
            boxSizing: 'border-box',
          }}
        />

        {/* ---- Rich text editor ---- */}
        {!loading && (
          <RichEditor
            key={dateStr}
            initialContent={content || null}
            onChange={handleContentChange}
            onEditorReady={e => {
              editorRef.current = e
            }}
            placeholder="Write anything…"
          />
        )}

        {loading && (
          <div
            style={{
              height: 200,
              display: 'flex',
              alignItems: 'flex-start',
              paddingTop: 4,
            }}
          >
            <div
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 17,
                color: '#2a2826',
              }}
            >
              ·
            </div>
          </div>
        )}

        <Divider />

        {/* ---- Highlight ---- */}
        <HighlightField value={highlight} onChange={handleHighlightChange} />

        <Divider />

        {/* ---- Images ---- */}
        <ImageUploader
          date={dateStr}
          images={images}
          onImagesChange={setImages}
        />

        <div style={{ marginTop: 28 }}>
          {/* ---- Audio / transcription ---- */}
          <AudioRecorder onTranscript={handleTranscript} />
        </div>
      </div>
    </div>
  )
}
