import { Button, Logo } from '../atoms'

/**
 * Shown while the app loads what every screen needs, and if that fails. It continues the static screen in
 * index.html (same look), so the window goes straight from "Starting" to the app. No percentages: loading takes
 * an unknown, usually very short, time, so the bar only shows that work is going on.
 */
export function StartupScreen({
  appName,
  status,
  error,
  onRetry
}: {
  appName: string
  status: 'loading' | 'failed'
  error: string | null
  onRetry: () => void
}) {
  return (
    <div className="startup">
      <div className="startup-card">
        <Logo size={64} />
        <div className="startup-name">{appName}</div>
        {status === 'loading' ? (
          <>
            <p role="status" className="muted">
              Loading your settings…
            </p>
            <div className="bar indeterminate" role="progressbar" aria-label="Loading">
              <span />
            </div>
          </>
        ) : (
          <div role="alert" className="startup-error">
            <p>
              <b>Your settings could not be loaded.</b>
            </p>
            {error && <p className="muted">{error}</p>}
            <p className="muted">Try again. If it keeps happening, restart {appName}.</p>
            <Button variant="primary" onClick={onRetry}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
