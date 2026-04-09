import { useParams } from 'react-router-dom'

export default function Journal() {
  const { date } = useParams<{ date: string }>()

  return (
    <div>
      <h1>Journal — {date}</h1>
      {/* TODO: Song of the day field */}
      {/* TODO: RichEditor (TipTap) */}
      {/* TODO: ImageUploader */}
      {/* TODO: AudioRecorder */}
      {/* TODO: Highlight field */}
      {/* Coming soon stubs: photo collage, AI highlight suggestion, song-based avatar */}
    </div>
  )
}
