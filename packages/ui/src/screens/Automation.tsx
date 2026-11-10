import { Link } from '@tanstack/react-router'
import { Icon } from '../design/atoms'
import { ScreenTemplate } from '../design/templates'

/**
 * Automation (Beta), as in the prototype: a notice that it is planned. Nothing runs in the background (redesign rule:
 * no fake features).
 */
export function Automation() {
  return (
    <ScreenTemplate
      title="Automation (Beta)"
      intro="Run the same formatting on many files without clicking through each one."
    >
      <div className="panel automation" role="status">
        <Icon name="automation" size={40} />
        <div>
          <h2>Planned for a future release</h2>
          <p className="muted">
            Automation isn't available yet, and nothing runs in the background. Until then, a{' '}
            <Link to="/templates">template</Link> starts a task with your usual settings in one click.
          </p>
        </div>
      </div>
    </ScreenTemplate>
  )
}
