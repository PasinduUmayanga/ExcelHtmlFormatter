import { cx } from '../../utils/cx'

/** A choice of one option out of a few, shown as joined buttons (`.seg`, a radio group). */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className
}: {
  /** What is being chosen, for screen readers */
  label: string
  value: T
  options: readonly (readonly [value: T, text: string])[]
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cx('seg', className)} role="radiogroup" aria-label={label}>
      {options.map(([option, text]) => (
        <button
          key={option}
          role="radio"
          aria-checked={option === value}
          // An empty class (not none) keeps the markup the screens had before.
          className={option === value ? 'on' : ''}
          onClick={() => onChange(option)}
        >
          {text}
        </button>
      ))}
    </div>
  )
}
