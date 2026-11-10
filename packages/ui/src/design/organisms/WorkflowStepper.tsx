import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { canVisit, useApp } from '../../state/store'
import { useFormatterApp } from '../../router'
import { actionOf, fileTypeOf } from '../../features/workflow/registry'
import { WORKFLOW_STEPS, stepIndex, type WorkflowStepId } from '../../features/workflow/steps'
import { cx } from '../../utils/cx'
import { Icon } from '../atoms'

/**
 * The full-width six-step bar on every workflow screen (prototype): done steps show a green tick, the current one
 * is blue and marked with aria-current="step", later ones are muted. Done workflow steps are links back; the first
 * two (chosen on Home) and later steps are not.
 */
export function WorkflowStepper({ current }: { current: WorkflowStepId }) {
  const { format } = useFormatterApp()
  const state = useApp()
  const { homeType, homeAction, doc, selected } = state
  const at = stepIndex(current)

  const detail: Partial<Record<WorkflowStepId, string>> = {
    type: fileTypeOf(homeType).label,
    action: actionOf(homeAction)?.label ?? '–',
    upload: doc ? doc.file.name : '–',
    configure: doc ? `${selected.length} of ${doc.sections.length} ${format.section.plural}` : undefined
  }
  // Where a done step's link goes, if it can be visited now.
  const back = (id: WorkflowStepId, body: ReactNode, className: string) => {
    if (id === 'upload' && state.workflowActive)
      return (
        <Link to="/upload" className={className}>
          {body}
        </Link>
      )
    if (id === 'configure' && canVisit(state, 'sections'))
      return (
        <Link to="/configure" search={{}} className={className}>
          {body}
        </Link>
      )
    if (id === 'preview' && canVisit(state, 'preview'))
      return (
        <Link
          to="/preview/$section"
          params={{ section: selected[0] }}
          search={{ view: undefined }}
          className={className}
        >
          {body}
        </Link>
      )
    return <span className={className}>{body}</span>
  }

  return (
    <nav className="stepper" aria-label="Workflow progress">
      <ol>
        {WORKFLOW_STEPS.map((step, i) => {
          const done = i < at
          const body = (
            <>
              <span className="step-circle">{done ? <Icon name="check" size={14} /> : i + 1}</span>
              <span className="step-copy">
                <span className="step-label">{step.label}</span>
                {detail[step.id] && <span className="step-detail">{detail[step.id]}</span>}
              </span>
            </>
          )
          const className = cx('step', done && 'done', i === at && 'current')
          return (
            <li key={step.id} aria-current={i === at ? 'step' : undefined}>
              {done && i >= 2 ? back(step.id, body, className) : <span className={className}>{body}</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
