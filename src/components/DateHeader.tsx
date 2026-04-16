interface DateParts {
  weekday: string
  day: string
  monthYear: string
}

export function formatDate(iso: string): DateParts {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
    day: String(d),
    monthYear: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  }
}

export function todayISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function DateHeader({ dateStr, className }: { dateStr: string; className?: string }) {
  const { weekday, day, monthYear } = formatDate(dateStr)

  return (
    <header className={className}>
      <div className="sb-date-weekday">{weekday}</div>
      <div className="sb-date-display">
        <span style={{ fontWeight: 600, color: 'var(--c-text-1)' }}>{day}</span>
        {' '}
        <span style={{ fontStyle: 'italic' }}>{monthYear}</span>
      </div>
    </header>
  )
}
