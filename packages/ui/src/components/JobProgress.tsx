import { useApp } from '../store'
import type { JobProgress as Progress } from '@hf/core'

/** Plain-language description of where a long task is. */
export function describeProgress(p: Progress, items = 'items'): string {
  const of = (unit: string) =>
    p.done !== undefined && p.total
      ? ` ${Math.min(p.done, p.total).toLocaleString()} of ${p.total.toLocaleString()} ${unit}`
      : ''
  switch (p.stage) {
    case 'reading':
      return 'Reading the file…'
    case 'scanning':
      return `Looking for HTML tags:${of(p.unit ?? 'sections')}${p.detail ? ` (${p.detail})` : ''}`
    case 'converting':
      return `Formatting ${items}:${of(p.unit ?? 'items')}${p.detail ? ` (${p.detail})` : ''}`
    case 'saving':
      return 'Saving the new file…'
  }
}

/** Progress bar with a Cancel button for the running load or export. */
export function JobProgressPanel({ title, items }: { title: string; items?: string }) {
  const { job, cancelJob } = useApp()
  const progress = job?.progress
  if (!progress) return null
  const percent = progress.total ? Math.min(100, Math.round(((progress.done ?? 0) / progress.total) * 100)) : null

  return (
    <div className="job" role="status" aria-live="polite">
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <div>
          <b>{title}</b>
          <div className="job-detail">{describeProgress(progress, items)}</div>
        </div>
        <button className="btn small" onClick={cancelJob}>
          Cancel
        </button>
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
