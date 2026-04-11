import { useRef, useState } from 'react'
import { journalApi } from '../api'

interface JournalImage {
  id: string
  r2_url: string
  caption: string | null
}

interface ImageUploaderProps {
  date: string
  images: JournalImage[]
  onImagesChange: (images: JournalImage[]) => void
}

export default function ImageUploader({ date, images, onImagesChange }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)
    let current = images
    try {
      for (const file of Array.from(files)) {
        const res = await journalApi.uploadImage(date, file)
        if (!res.ok) {
          let msg = `Upload failed (${res.status})`
          try {
            const body = await res.json() as { error?: string }
            if (body.error) msg = body.error
          } catch { /* ignore JSON parse error */ }
          throw new Error(msg)
        }
        const newImage = (await res.json()) as JournalImage
        current = [...current, newImage]
        onImagesChange(current)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
      console.error('Image upload error:', err)
    } finally {
      setUploading(false)
      // Reset the file input so the same file can be re-selected after an error
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      {images.length > 0 && (
        <div className="sb-image-grid">
          {images.map(img => (
            <div key={img.id} className="sb-image-item">
              <img src={img.r2_url} alt={img.caption ?? ''} loading="lazy" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p style={{
          fontFamily: 'var(--f-ui)',
          fontSize: 'var(--t-xs)',
          color: 'var(--c-danger)',
          marginBottom: 'var(--sp-2)',
        }}>
          {error}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />

      <button
        type="button"
        disabled={uploading}
        className="sb-ghost-btn"
        onClick={() => fileRef.current?.click()}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        {uploading ? 'Uploading…' : images.length > 0 ? 'Add more photos' : 'Add photos'}
      </button>
    </div>
  )
}
