import { Link, useRouter } from '@tanstack/react-router'
import { useApp } from '../state/store'
import { actionOf, fileTypeOf } from '../features/workflow/registry'
import { WORKFLOW_STEPS, stepIndex, stepOfPath } from '../features/workflow/steps'
import { Button, FileGlyph, Icon } from '../design/atoms'
import { RecentActivity } from '../design/organisms'
import { ScreenTemplate } from '../design/templates'

/**
 * My Workspace (prototype): shortcuts, the task in progress with the step it is at and Resume, and the recent files.
 */
export function Workspace() {
  const { workflowActive, doc, lastStep, homeType, homeAction } = useApp()
  const router = useRouter()
  // Where the task is: the last workflow screen visited, or Upload when no file is open yet.
  const resumeAt = doc && lastStep ? lastStep : '/upload'
  const step = stepOfPath(resumeAt.split('?')[0]) ?? 'upload'
  const type = fileTypeOf(homeType)

  return (
    <ScreenTemplate title="My Workspace" intro="Continue your task and get to your files and formatting profiles.">
      <div className="quick-grid workspace-quick">
        <Link to="/" className="quick-action">
          <Icon name="home" size={22} />
          <span>
            <b>New workflow</b>
            <span className="muted text-sm">Choose a file type and action</span>
          </span>
        </Link>
        <Link to="/recent" className="quick-action">
          <Icon name="recent" size={22} />
          <span>
            <b>Recent files</b>
            <span className="muted text-sm">Open a file again</span>
          </span>
        </Link>
        <Link to="/settings" search={{ tag: undefined, back: undefined }} className="quick-action">
          <Icon name="profiles" size={22} />
          <span>
            <b>Profiles</b>
            <span className="muted text-sm">Manage tag styles</span>
          </span>
        </Link>
      </div>

      {workflowActive ? (
        <section className="session" aria-labelledby="session-title">
          <FileGlyph kind={type.id} size={44} />
          <div className="session-text">
            <h2 id="session-title">Active task</h2>
            <p>
              {type.label} · {actionOf(homeAction)?.label ?? 'No action chosen'} · Step {stepIndex(step) + 1} of{' '}
              {WORKFLOW_STEPS.length}: {WORKFLOW_STEPS[stepIndex(step)].label}
            </p>
            <p className="muted text-sm">{doc ? doc.file.name : 'No file chosen yet'}</p>
          </div>
          <Button variant="primary" onClick={() => router.history.push(resumeAt)}>
            Resume workflow →
          </Button>
        </section>
      ) : (
        <div className="placeholder workspace-empty">
          No active workflow yet. Choose a file type on <Link to="/">Home</Link> to begin.
        </div>
      )}

      <RecentActivity limit={5} title="Recent files" />
    </ScreenTemplate>
  )
}
