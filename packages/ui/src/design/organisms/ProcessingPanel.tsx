import type { JobProgress } from '@hf/core'
import { useApp } from '../../state/store'
import { describeProgress } from '../../utils/describeProgress'
import { cx } from '../../utils/cx'
import { Button, Icon } from '../atoms'

/** Every stage a file really goes through, in order (JobProgress['stage']). */
export const STAGES: readonly [JobProgress['stage'], string][] = [
  ['reading', 'Reading file'],
  ['scanning', 'Finding HTML tags'],
  ['checking', 'Checking that no text is lost'],
  ['converting', 'Applying formatting'],
  ['saving', 'Saving the new file'],
  ['verifying', 'Checking the saved file']
]

/** The stage the open file is at: the save's progress while saving, otherwise the content check's. */
export function currentStage(
  job: { kind: string; progress: JobProgress | null } | null,
  check: { status: string; progress: JobProgress | null }
): JobProgress | null {
  if (job?.kind === 'export' && job.progress) return job.progress
  if (check.status === 'running') return check.progress ?? { stage: 'checking' }
  return null
}

/**
 * Processing (prototype step "Processing (with progress)"): a ring and the list of stages, driven by the real
 * progress the worker reports. The ring shows a percentage only when the stage reports counts; otherwise it turns
 * without a number. While saving it has Cancel. Hidden when nothing is running.
 */
export function ProcessingPanel({ items }: { items: string }) {
  const { job, check, cancelJob } = useApp()
  const progress = currentStage(job, check)
  if (!progress) return null
  const at = STAGES.findIndex(([stage]) => stage === progress.stage)
  const percent = progress.total ? Math.min(100, Math.round(((progress.done ?? 0) / progress.total) * 100)) : null
  const saving = job?.kind === 'export'
  // The ring: a circle whose stroke is drawn up to the percentage (r = 52, so the length is about 327).
  const length = 2 * Math.PI * 52

  return (
    <div className="job processing" role="status" aria-live="polite">
      <div className="processing-ring">
        <svg
          viewBox="0 0 120 120"
          className={percent === null ? 'spinning' : undefined}
          role="progressbar"
          aria-label={saving ? 'Saving' : 'Checking'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent ?? undefined}
        >
          <circle cx="60" cy="60" r="52" className="ring-track" />
          <circle
            cx="60"
            cy="60"
            r="52"
            className="ring-fill"
            strokeDasharray={`${percent === null ? length * 0.25 : (length * percent) / 100} ${length}`}
          />
        </svg>
        <span className="ring-label">{percent === null ? '' : `${percent}%`}</span>
      </div>
      <div className="processing-text">
        <b>{saving ? 'Saving your file…' : 'Processing your file…'}</b>
        <div className="job-detail">{describeProgress(progress, items)}</div>
        <ol className="stages">
          {STAGES.map(([stage, label], i) => (
            <li key={stage} className={cx(i < at && 'done', i === at && 'doing')}>
              <Icon name={i < at ? 'passed' : i === at ? 'next' : 'neutral'} size={16} />
              {label}
            </li>
          ))}
        </ol>
        {saving && (
          <Button small onClick={cancelJob}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}
