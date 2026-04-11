import { useRef, useState } from 'react'
import { audioApi } from '../api'

type Status = 'idle' | 'recording' | 'transcribing' | 'done' | 'error'

interface AudioRecorderProps {
  onTranscript?: (text: string) => void
}

export default function AudioRecorder({ onTranscript }: AudioRecorderProps) {
  const [status, setStatus] = useState<Status>('idle')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  async function transcribe(blob: Blob) {
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
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        await transcribe(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }))
      }
      recorder.start()
      recorderRef.current = recorder
      setStatus('recording')
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2500)
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
    recorderRef.current = null
  }

  const isRecording = status === 'recording'
  const isBusy = status === 'transcribing'

  const labels: Record<Status, string> = {
    idle: 'Transcribe audio',
    recording: 'Stop',
    transcribing: 'Transcribing…',
    done: 'Done',
    error: 'Error — retry',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        disabled={isBusy || status === 'done'}
        className="sb-ghost-btn"
        style={isRecording ? {
          borderColor: 'rgba(192,80,80,0.4)',
          color: '#d06060',
        } : undefined}
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? (
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: '#d06060',
            animation: 'sb-pulse 1s ease-in-out infinite',
            flexShrink: 0,
          }} />
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        )}
        {labels[status]}
      </button>

      {status === 'idle' && (
        <>
          <input ref={fileRef} type="file" accept="audio/*" style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && transcribe(e.target.files[0])} />
          <button type="button" className="sb-ghost-btn"
            style={{ color: 'var(--c-text-3)', borderStyle: 'solid' }}
            onClick={() => fileRef.current?.click()}>
            Upload file
          </button>
        </>
      )}

      <style>{`@keyframes sb-pulse { 0%,100%{opacity:1} 50%{opacity:.25} }`}</style>
    </div>
  )
}
