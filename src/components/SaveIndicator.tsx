export default function SaveIndicator({ status }: { status: string }) {
  const visible = status !== 'idle'
  const text =
    status === 'saving' ? 'saving\u2026'
    : status === 'saved' ? 'saved \u2713'
    : status === 'error' ? 'error'
    : ''

  return (
    <div
      className="sb-saved"
      data-visible={String(visible)}
      data-state={status}
    >
      {text}
    </div>
  )
}
