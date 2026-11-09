import type { ReactNode } from 'react'
import { cx } from '../../utils/cx'

/**
 * A labelled setting: the label on the left, its control(s) on the right (`.field`).
 * `htmlFor` ties the label to one control; leave it out when the control has its own label (a group of buttons).
 */
export function Field({
  label,
  htmlFor,
  alignTop = false,
  className,
  children
}: {
  label: string
  htmlFor?: string
  /** Line the label up with the top of a tall control (e.g. previews) instead of its middle */
  alignTop?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cx('field', alignTop && 'top', className)}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  )
}
