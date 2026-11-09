import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../../utils/cx'

export interface RadioCardOption<T extends string> {
  value: T
  /** Unavailable options are shown, announced as unavailable, and can't be chosen */
  disabled?: boolean
}

/**
 * A choice of one card out of several, behaving like a radio group (redesign guide §7): one tab stop, arrow keys move
 * the choice between available cards, Home/End jump to the ends. `renderCard` draws each card's content, which is
 * also its accessible name (title, description and any "Coming soon").
 */
export function RadioCards<T extends string>({
  label,
  value,
  options,
  onChange,
  renderCard,
  className
}: {
  label: string
  value: T | null
  options: readonly RadioCardOption<T>[]
  onChange: (value: T) => void
  renderCard: (option: RadioCardOption<T>, checked: boolean) => ReactNode
  className?: string
}) {
  const refs = useRef(new Map<T, HTMLButtonElement>())
  const enabled = options.filter((o) => !o.disabled)
  // The tab stop: the chosen card, or the first one that can be chosen.
  const tabStop = enabled.some((o) => o.value === value) ? value : (enabled[0]?.value ?? null)

  const onKeyDown = (e: KeyboardEvent, current: T) => {
    const i = enabled.findIndex((o) => o.value === current)
    const moves: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
    let next: number | undefined
    if (e.key in moves) next = (i + moves[e.key] + enabled.length) % enabled.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = enabled.length - 1
    if (next === undefined || !enabled.length) return
    e.preventDefault()
    const target = enabled[next].value
    onChange(target)
    refs.current.get(target)?.focus()
  }

  return (
    <div className={cx('radio-cards', className)} role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const checked = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => {
              if (el) refs.current.set(option.value, el)
              else refs.current.delete(option.value)
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={option.disabled || undefined}
            tabIndex={option.value === tabStop ? 0 : -1}
            className={cx('radio-card', checked && 'checked', option.disabled && 'unavailable')}
            onClick={() => !option.disabled && onChange(option.value)}
            onKeyDown={(e) => !option.disabled && onKeyDown(e, option.value)}
          >
            {renderCard(option, checked)}
          </button>
        )
      })}
    </div>
  )
}
