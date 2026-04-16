import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Editor } from '@tiptap/react'
import { journalApi, spotifyApi, settingsApi } from '../api'
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
  spotifyMode, onRefresh, onEdit,
}: {
  title: string
  artist: string
  onTitleChange: (v: string) => void
  onArtistChange: (v: string) => void
  spotifyMode?: boolean
  onRefresh?: () => void
  onEdit?: () => void
}) {
  if (spotifyMode && title) {
    return (
      <div className={styles.spotifySong}>
        <svg className={styles.spotifyIcon} width="16" height="16" viewBox="0 0 24 24" fill="#1DB954">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
        <span className={styles.spotifySongText}>
          {title} <span className={styles.spotifySongArtist}>– {artist}</span>
        </span>
        <button type="button" className={styles.spotifyBtn} onClick={onRefresh} title="Refresh from Spotify">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
            <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
          </svg>
        </button>
        <button type="button" className={styles.spotifyBtn} onClick={onEdit} title="Edit manually">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="sb-song-row">
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
  const [spotifyMode, setSpotifyMode] = useState(false)
  const editorRef = useRef<Editor | null>(null)
  const ready = useRef(false)

  // Auto-fetch song from Spotify
  const fetchSpotifySong = useCallback(async () => {
    try {
      const r = await spotifyApi.getTopTrack(dateStr)
      if (!r.ok) return
      const data = await r.json() as { song_title: string; song_artist: string }
      setSongTitle(data.song_title)
      setSongArtist(data.song_artist)
      setSpotifyMode(true)
    } catch { /* ignore */ }
  }, [dateStr])

  // Load entry + images whenever the date changes
  useEffect(() => {
    setLoading(true)
    ready.current = false

    Promise.all([
      journalApi.get(dateStr).then(r => (r.ok ? r.json() : null)),
      journalApi.getImages(dateStr).then(r => (r.ok ? r.json() : [])),
    ]).then(async ([entry, imgs]) => {
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

      // Auto-fetch from Spotify if no song yet and auto-fetch is enabled
      if (!e?.song_title) {
        try {
          const sr = await settingsApi.get()
          if (sr.ok) {
            const s = await sr.json() as { spotify_auto_fetch?: number; spotify_username?: string | null }
            if (s.spotify_auto_fetch && s.spotify_username) {
              fetchSpotifySong()
            }
          }
        } catch { /* ignore */ }
      } else if (e?.song_title) {
        // Check if this was a Spotify-fetched song (has no manual edits indicator)
        setSpotifyMode(false)
      }
    })
  }, [dateStr, fetchSpotifySong])

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
          spotifyMode={spotifyMode}
          onRefresh={fetchSpotifySong}
          onEdit={() => setSpotifyMode(false)}
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
