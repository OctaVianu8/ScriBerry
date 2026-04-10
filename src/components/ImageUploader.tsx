import { useRef, useState } from 'react'
import { mediaApi, journalApi } from '../api'

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
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        // 1. Get an upload key
        const urlRes = await mediaApi.getUploadUrl()
        if (!urlRes.ok) throw new Error('Failed to get upload URL')
        const { uploadUrl } = (await urlRes.json()) as {
          key: string
          uploadUrl: string
        }

        // 2. Upload the file directly
        const uploadRes = await mediaApi.uploadFile(uploadUrl, file)
        if (!uploadRes.ok) throw new Error('Upload failed')
        const { url: r2_url } = (await uploadRes.json()) as { url: string }

        // 3. Register URL in D1
        const saveRes = await journalApi.saveImage(date, { r2_url })
        if (!saveRes.ok) throw new Error('Failed to save image record')
        const newImage = (await saveRes.json()) as JournalImage

        onImagesChange([...images, newImage])
        // re-read images for subsequent iterations
        images = [...images, newImage]
      }
    } catch (err) {
      console.error('Image upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {/* Masonry image grid */}
      {images.length > 0 && (
        <div
          style={{
            columns: images.length === 1 ? 1 : '2 160px',
            columnGap: 8,
            marginBottom: 16,
          }}
        >
          {images.map(img => (
            <div
              key={img.id}
              style={{
                breakInside: 'avoid',
                marginBottom: 8,
                borderRadius: 8,
                overflow: 'hidden',
                background: '#161412',
              }}
            >
              <img
                src={img.r2_url}
                alt={img.caption ?? ''}
                loading="lazy"
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  objectFit: 'cover',
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Upload trigger */}
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
        onClick={() => fileRef.current?.click()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 14px',
          border: '1px dashed rgba(255,255,255,0.12)',
          borderRadius: 8,
          background: 'transparent',
          color: uploading ? '#4a4540' : '#6b6560',
          fontSize: 13,
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'color 0.15s, border-color 0.15s',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
        onMouseEnter={e => {
          if (!uploading) {
            ;(e.currentTarget as HTMLButtonElement).style.color = '#a09080'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor =
              'rgba(255,255,255,0.2)'
          }
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLButtonElement).style.color = '#6b6560'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor =
            'rgba(255,255,255,0.12)'
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        {uploading ? 'Uploading…' : images.length > 0 ? 'Add more photos' : 'Add photos'}
      </button>
    </div>
  )
}
