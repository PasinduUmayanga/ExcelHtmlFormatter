import { cx } from '../../utils/cx'
import { Icon, type IconName } from '../atoms'

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
  /** [value, text, optional icon shown before the text] */
  options: readonly (readonly [value: T, text: string, icon?: IconName])[]
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cx('seg', className)} role="radiogroup" aria-label={label}>
      {options.map(([option, text, icon]) => (
        <button
          key={option}
          role="radio"
          aria-checked={option === value}
          // An empty class (not none) keeps the markup the screens had before.
          className={option === value ? 'on' : ''}
          onClick={() => onChange(option)}
        >
          {icon && <Icon name={icon} />}
          {text}
        </button>
      ))}
    </div>
  )
}
