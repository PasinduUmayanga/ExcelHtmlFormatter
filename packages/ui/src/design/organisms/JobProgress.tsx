import { useApp } from '../../state/store'
import { describeProgress } from '../../utils/describeProgress'
import { Button } from '../atoms'

/** Progress bar with a Cancel button for the running load or export. */
export function JobProgressPanel({ title, items }: { title: string; items?: string }) {
  const { job, cancelJob } = useApp()
  const progress = job?.progress
  if (!progress) return null
  const percent = progress.total ? Math.min(100, Math.round(((progress.done ?? 0) / progress.total) * 100)) : null

  return (
    <div className="job" role="status" aria-live="polite">
      <div className="row spread nowrap">
        <div>
          <b>{title}</b>
          <div className="job-detail">{describeProgress(progress, items)}</div>
        </div>
        <Button small onClick={cancelJob}>
          Cancel
        </Button>
      </div>
      <div
        className={`bar ${percent === null ? 'indeterminate' : ''}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
      >
        <span style={percent === null ? undefined : { width: `${percent}%` }} />
      </div>
    </div>
  )
}
