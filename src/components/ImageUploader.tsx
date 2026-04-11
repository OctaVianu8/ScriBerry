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
    let current = images
    try {
      for (const file of Array.from(files)) {
        const urlRes = await mediaApi.getUploadUrl()
        if (!urlRes.ok) throw new Error('Failed to get upload URL')
        const { uploadUrl } = (await urlRes.json()) as { key: string; uploadUrl: string }

        const uploadRes = await mediaApi.uploadFile(uploadUrl, file)
        if (!uploadRes.ok) throw new Error('Upload failed')
        const { url: r2_url } = (await uploadRes.json()) as { url: string }

        const saveRes = await journalApi.saveImage(date, { r2_url })
        if (!saveRes.ok) throw new Error('Failed to save image record')
        const newImage = (await saveRes.json()) as JournalImage

        current = [...current, newImage]
        onImagesChange(current)
      }
    } catch (err) {
      console.error('Image upload error:', err)
    } finally {
      setUploading(false)
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
