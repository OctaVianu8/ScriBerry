import { useCallback, useRef, useState } from 'react'

type SaveFn<T> = (data: T) => Promise<void>

export function useAutoSave<T>(saveFn: SaveFn<T>, delay = 1000) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const save = useCallback(
    (data: T) => {
      if (timer.current) clearTimeout(timer.current)
      if (resetTimer.current) clearTimeout(resetTimer.current)
      setStatus('saving')
      timer.current = setTimeout(async () => {
        try {
          await saveFn(data)
          setStatus('saved')
          resetTimer.current = setTimeout(() => setStatus('idle'), 2500)
        } catch {
          setStatus('error')
        }
      }, delay)
    },
    [saveFn, delay],
  )

  return { save, status }
}
