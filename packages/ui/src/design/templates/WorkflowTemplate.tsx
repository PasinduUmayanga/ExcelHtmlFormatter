import type { ReactNode } from 'react'
import type { WorkflowStepId } from '../../features/workflow/steps'
import { Icon } from '../atoms'
import { WorkflowStepper, WorkflowSummary } from '../organisms'

/**
 * Every workflow screen (prototype "Horizontal Steps"): the six-step bar across the top, the screen with its title,
 * one line on what it is for and its content, the "Workflow summary" beside it, and Back / Continue at the bottom.
 */
export function WorkflowTemplate({
  step,
  title,
  intro,
  back,
  next,
  footer,
  children
}: {
  step: WorkflowStepId
  title: ReactNode
  intro: ReactNode
  /** The way back (left of the bottom bar) */
  back?: ReactNode
  /** The next step (right of the bottom bar) */
  next?: ReactNode
  /** A screen's own bottom bar instead of back / next (two items: left and right) */
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="workflow">
      <WorkflowStepper current={step} />
      <div className="workflow-body">
        <div className="workflow-main">
          <h1>{title}</h1>
          <p className="sub">{intro}</p>
          {children}
          {footer ? (
            <div className="footer workflow-footer">{footer}</div>
          ) : (
            <div className="footer workflow-footer">
              <div>{back}</div>
              <span className="footer-note">
                <Icon name="info" size={14} /> Your original file is never changed
              </span>
              <div className="row">{next}</div>
            </div>
          )}
        </div>
        <WorkflowSummary />
      </div>
    </div>
  )
}
