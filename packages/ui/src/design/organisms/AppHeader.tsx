import { Link } from '@tanstack/react-router'
import type { ThemeChoice } from '@hf/core'
import { useApp } from '../../state/store'
import { SegmentedControl } from '../molecules'

const THEMES = [
  ['light', 'Light'],
  ['dark', 'Dark'],
  ['system', 'System']
] as const satisfies readonly (readonly [ThemeChoice, string])[]

/** The bar above every screen: app-wide controls (Help and the theme). */
export function AppHeader() {
  const { theme, setTheme } = useApp()
  return (
    <header className="app-header">
      <Link to="/help" search={{ q: undefined }} className="btn small">
        Help
      </Link>
      <span className="muted text-sm" aria-hidden>
        Theme
      </span>
      <SegmentedControl label="Theme" value={theme} options={THEMES} onChange={(next) => void setTheme(next)} />
    </header>
  )
}
