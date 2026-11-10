import { Link } from '@tanstack/react-router'
import type { ThemeChoice } from '@hf/core'
import { useApp } from '../../state/store'
import { Icon } from '../atoms'
import { SegmentedControl } from '../molecules'
import { SearchBox } from './SearchBox'

const THEMES = [
  ['light', 'Light', 'sun'],
  ['dark', 'Dark', 'moon'],
  ['system', 'System', 'monitor']
] as const satisfies readonly (readonly [ThemeChoice, string, 'sun' | 'moon' | 'monitor'])[]

/** The bar above every screen (prototype top bar): search, Help, and the theme. */
export function AppHeader() {
  const { theme, setTheme } = useApp()
  return (
    <header className="app-header">
      <SearchBox />
      <div className="header-actions">
        <Link to="/help" search={{ q: undefined }} className="btn small">
          <Icon name="help" />
          Help
        </Link>
        <span className="theme-label muted" aria-hidden>
          <Icon name="sun" />
          Theme
        </span>
        <SegmentedControl label="Theme" value={theme} options={THEMES} onChange={(next) => void setTheme(next)} />
      </div>
    </header>
  )
}
