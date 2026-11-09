import { useEffect } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { useApp } from '../../store'
import { AppHeader, Sidebar } from '../organisms'
import { Icon } from '../atoms'

const DOCUMENT_SCREENS = /^\/(sections|analysis|preview|check)(\/|\?|$)/

/** The window frame shared by every screen: sidebar, error banner, current screen, toast. */
export function AppLayout() {
  const { error, setError, init, notice, rememberStep } = useApp()
  const href = useRouterState({ select: (s) => s.location.href })

  useEffect(() => {
    init()
  }, [init])

  // Remember the last document screen, so Home's "Continue" returns to it.
  useEffect(() => {
    if (DOCUMENT_SCREENS.test(href)) rememberStep(href)
  }, [href, rememberStep])

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
