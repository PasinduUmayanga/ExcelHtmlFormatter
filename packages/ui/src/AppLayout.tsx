import { useEffect } from 'react'
import { Outlet } from '@tanstack/react-router'
import { useApp } from './store'
import { Sidebar } from './components/Sidebar'

/** The window frame shared by every screen: sidebar, error banner, current screen, toast. */
export function AppLayout() {
  const { error, setError, init, notice } = useApp()

  useEffect(() => {
    init()
  }, [init])

  return (
    <div className="app">
      <Sidebar />
      <main>
        {error && (
          <div className="error" role="alert">
            <span>⚠ {error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss">
              ✕
            </button>
          </div>
        )}
        <Outlet />
      </main>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </div>
  )
}
