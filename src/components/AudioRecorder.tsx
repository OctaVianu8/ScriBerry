interface AudioRecorderProps {
  onTranscript?: (text: string) => void
}

export default function AudioRecorder({ onTranscript: _onTranscript }: AudioRecorderProps) {
  return (
    <div>
      {/* TODO: record audio, upload to R2 via signed URL, transcribe via Workers AI */}
      <button type="button" disabled>Record Audio (coming soon)</button>
    </div>
  )
}
