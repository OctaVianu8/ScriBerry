interface CalendarGridProps {
  year: number
  month: number // 1-12
  onDayClick?: (date: string) => void
}

export default function CalendarGrid({ year, month, onDayClick }: CalendarGridProps) {
  // TODO: render month grid with activity dots
  // Blue = journal, Green = gym, Orange = reading
  void year; void month; void onDayClick

  return (
    <div>
      {/* TODO: calendar grid */}
    </div>
  )
}
