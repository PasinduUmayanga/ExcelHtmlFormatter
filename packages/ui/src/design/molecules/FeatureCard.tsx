import { useId, type ReactNode } from 'react'
import { cx } from '../cx'

/**
 * A card for one thing the user can do: a title, a sentence about it, and its action. `primary` marks the
 * main action on a screen; `unavailable` dims a feature that can't be used yet (its action should be a
 * disabled button, so screen readers announce it as unavailable).
 */
export function FeatureCard({
  title,
  description,
  action,
  badge,
  primary = false,
  unavailable = false
}: {
  title: string
  description: ReactNode
  action?: ReactNode
  badge?: ReactNode
  primary?: boolean
  unavailable?: boolean
}) {
  const id = useId()
  return (
    <section className={cx('feature', primary && 'primary', unavailable && 'unavailable')} aria-labelledby={id}>
      <div className="feature-head">
        <h3 id={id}>{title}</h3>
        {badge}
      </div>
      <p className="feature-desc">{description}</p>
      {action && <div className="feature-action">{action}</div>}
    </section>
  )
}
