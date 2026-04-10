import { useRef, useState } from 'react'
import { audioApi } from '../api'

type RecorderStatus = 'idle' | 'recording' | 'transcribing' | 'done' | 'error'

interface AudioRecorderProps {
  onTranscript?: (text: string) => void
}

export default function AudioRecorder({ onTranscript }: AudioRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  async function transcribeBlob(blob: Blob) {
    setStatus('transcribing')
    try {
      const res = await audioApi.transcribe(blob)
      if (!res.ok) throw new Error('Transcription failed')
      const { transcript } = (await res.json()) as { transcript: string }
      onTranscript?.(transcript)
      setStatus('done')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2500)
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        await transcribeBlob(blob)
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setStatus('recording')
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2500)
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    await transcribeBlob(files[0])
  }

  const label: Record<RecorderStatus, string> = {
    idle: 'Transcribe audio',
    recording: 'Stop recording',
    transcribing: 'Transcribing…',
    done: 'Done',
    error: 'Error — try again',
  }

  const isRecording = status === 'recording'
  const isBusy = status === 'transcribing'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Record / stop button */}
      <button
        type="button"
        disabled={isBusy || status === 'done'}
        onClick={isRecording ? stopRecording : startRecording}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 14px',
          border: isRecording
            ? '1px solid rgba(220,60,60,0.35)'
            : '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          background: isRecording ? 'rgba(220,60,60,0.08)' : 'transparent',
          color: isRecording
            ? '#e05555'
            : isBusy
              ? '#4a4540'
              : status === 'error'
                ? '#c06060'
                : '#6b6560',
          fontSize: 13,
          cursor: isBusy || status === 'done' ? 'not-allowed' : 'pointer',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          transition: 'all 0.15s',
        }}
      >
        {/* Mic icon / recording dot */}
        {isRecording ? (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#e05555',
              animation: 'scriberry-pulse 1s ease-in-out infinite',
            }}
          />
        ) : (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
        {label[status]}
      </button>

      {/* Upload audio file */}
      {status === 'idle' && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={e => handleFileUpload(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 12px',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              background: 'transparent',
              color: '#4a4540',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            Upload file
          </button>
        </>
      )}

      <style>{`
        @keyframes scriberry-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
