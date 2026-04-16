import { useCallback, useEffect, useRef } from 'react'

export function useAutoGrow(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [])

  useEffect(() => {
    resize()
  }, [value, resize])

  return { ref, resize }
}
