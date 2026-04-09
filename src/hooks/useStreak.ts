import { useEffect, useState } from 'react'

interface StreakData {
  journal: number
  gym: number
  reading: number
}

export function useStreak() {
  const [streaks, setStreaks] = useState<StreakData | null>(null)

  useEffect(() => {
    // TODO: fetch from /api/streak
    void setStreaks
  }, [])

  return streaks
}
