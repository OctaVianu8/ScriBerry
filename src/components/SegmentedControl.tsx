import styles from './SegmentedControl.module.css'

interface SegmentedControlProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

export default function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div className={styles.wrap}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={styles.segment}
          data-selected={String(opt.value === value)}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
