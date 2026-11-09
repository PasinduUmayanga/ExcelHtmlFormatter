import { Icon } from '../atoms'
import { cx } from '../../utils/cx'

export interface JourneyStep {
  title: string
  hint: string
}

/**
 * The three parts of a task, shown across Home (prototype): numbers up to `current` are filled, and the current step
 * is marked for screen readers with aria-current. An ordered list, so the order is announced too.
 */
export function JourneySteps({ steps, current }: { steps: readonly JourneyStep[]; current: number }) {
  return (
    <ol className="journey" aria-label="How it works">
      {steps.map((step, i) => (
        <li key={step.title} className="journey-item" aria-current={i === current ? 'step' : undefined}>
          <span className={cx('journey-num', i <= current && 'on')}>{i + 1}</span>
          <span className="journey-text">
            <b>{step.title}</b>
            <span className="muted text-sm">{step.hint}</span>
          </span>
          {i < steps.length - 1 && <Icon name="chevron" size={22} />}
        </li>
      ))}
    </ol>
  )
}
