import { useEffect } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { useApp } from '../../state/store'
import { AppHeader, Sidebar } from '../organisms'
import { Icon } from '../atoms'
import { useFormatterApp } from '../../router'
import { StartupScreen } from './StartupScreen'

const DOCUMENT_SCREENS = /^\/(upload|configure|preview|check|complete)(\/|\?|$)/

/** The window frame shared by every screen: sidebar, error banner, current screen, toast. */
export function AppLayout() {
  const { error, setError, init, notice, rememberStep, startup, retryStartup } = useApp()
  const { format } = useFormatterApp()
  const href = useRouterState({ select: (s) => s.location.href })

  useEffect(() => {
    init()
  }, [init])

  // Remember the last document screen, so Home's "Continue" returns to it.
  useEffect(() => {
    if (DOCUMENT_SCREENS.test(href)) rememberStep(href)
  }, [href, rememberStep])

  // Until the settings are loaded no screen can work: show the startup screen (with Try again on failure).
  if (startup.status !== 'ready') {
    return (
      <StartupScreen
        appName={format.appName}
        status={startup.status}
        error={startup.error}
        onRetry={() => void retryStartup()}
      />
    )
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main-col">
        <AppHeader />
        <main>
          {error && (
            <div className="error" role="alert">
              <span>
                <Icon name="warning" /> {error}
              </span>
              <button onClick={() => setError(null)} aria-label="Dismiss">
                <Icon name="close" />
              </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </div>
  )
}
