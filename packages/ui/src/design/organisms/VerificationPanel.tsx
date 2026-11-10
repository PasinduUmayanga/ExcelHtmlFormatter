import { count } from '@hf/core'
import { useApp } from '../../state/store'
import { useFormatterApp } from '../../router'
import { Badge, Icon } from '../atoms'
import { CheckChip } from './CheckChip'

/**
 * "Content verification" beside the preview (prototype step 5), from the real content check: Passed when nothing is
 * lost, Needs review when cells have issues, Checking… while it runs. The check chip below keeps the details and
 * the way to the compare screen.
 */
export function VerificationPanel({ section, onRetry }: { section: string; onRetry: () => void }) {
  const { format } = useFormatterApp()
  const { check, isCheckCurrent, selected } = useApp()
  const { unit } = format
  const report = check.status === 'done' && isCheckCurrent() ? check.report : null
  const status =
    check.status === 'running'
      ? ({ tone: 'info', label: 'Checking…' } as const)
      : check.status === 'failed'
        ? ({ tone: 'warn', label: 'Not checked' } as const)
        : report
          ? report.issues > 0
            ? ({ tone: 'warn', label: 'Needs review' } as const)
            : ({ tone: 'ok', label: 'Passed' } as const)
          : ({ tone: 'muted', label: 'Not checked' } as const)

  return (
    <section className="verification" aria-labelledby="verification-title">
      <h2 id="verification-title">
        <Icon name="passed" size={18} /> Content verification <Badge tone={status.tone}>{status.label}</Badge>
      </h2>
      {report && (
        <ul className="vchecks">
          <li className={report.issues === 0 ? 'ok' : 'warn'}>
            <Icon name={report.issues === 0 ? 'passed' : 'attention'} size={16} />
            {report.issues === 0 ? 'All content preserved' : `${count(report.issues, unit)} to review`}
          </li>
          <li className="ok">
            <Icon name="passed" size={16} /> {count(report.checked, unit)} checked in{' '}
            {count(selected.length, format.section)}
          </li>
          {report.notes > 0 && (
            <li>
              <Icon name="info" size={16} /> {count(report.notes, { singular: 'note', plural: 'notes' })}
            </li>
          )}
        </ul>
      )}
      <CheckChip section={section} onRetry={onRetry} />
    </section>
  )
}
