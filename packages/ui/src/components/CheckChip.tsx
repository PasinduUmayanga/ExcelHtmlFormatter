import { useNavigate } from '@tanstack/react-router'
import { count } from '@hf/core'
import { useApp } from '../store'
import { useFormatterApp } from '../router'
import { describeProgress } from './JobProgress'

/**
 * The content check's status on Preview & export: running, all complete, or issues to review
 * (which opens the compare screen).
 */
export function CheckChip({ section, onRetry }: { section: string; onRetry: () => void }) {
  const { format } = useFormatterApp()
  const { check, isCheckCurrent } = useApp()
  const navigate = useNavigate()
  const { unit } = format
  const open = (cell?: string, target = section) =>
    navigate({ to: '/check/$section', params: { section: target }, search: { cell, saved: undefined } })

  if (check.status === 'running') {
    return (
      <div className="check-chip" role="status" aria-live="polite">
        <span className="spinner" aria-hidden />{' '}
        {check.progress ? describeProgress(check.progress, unit.plural) : 'Checking that no text is lost…'}
      </div>
    )
  }
  if (check.status === 'failed') {
    return (
      <div className="check-chip warn" role="status">
        ⚠ {check.error}{' '}
        <button className="btn link" onClick={onRetry}>
          Try again
        </button>
      </div>
    )
  }
  const report = check.report
  if (check.status !== 'done' || !report || !isCheckCurrent()) return null
  if (report.issues > 0) {
    const first = report.items[0]
    return (
      <div className="check-chip warn" role="status">
        ⚠ Content check: {count(report.issues, unit)} {report.issues === 1 ? 'needs' : 'need'} review.{' '}
        <button className="btn link" onClick={() => open(first?.location, first?.section)}>
          Review →
        </button>
      </div>
    )
  }
  return (
    <div className="check-chip ok" role="status">
      ✓ Content check: all {count(report.checked, unit)} complete, no text lost.
      {report.notes > 0 && (
        <>
          {' '}
          <button className="btn link" onClick={() => open(report.items[0]?.location, report.items[0]?.section)}>
            {count(report.notes, { singular: 'note', plural: 'notes' })} →
          </button>
        </>
      )}
    </div>
  )
}
