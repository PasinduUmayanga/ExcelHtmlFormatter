import type { ThemeChoice } from '@hf/core'
import { useApp } from '../../store'
import { SegmentedControl } from '../molecules'

const THEMES = [
  ['light', 'Light'],
  ['dark', 'Dark'],
  ['system', 'System']
] as const satisfies readonly (readonly [ThemeChoice, string])[]

/** The bar above every screen: app-wide controls (the theme; Help joins it later). */
export function AppHeader() {
  const { theme, setTheme } = useApp()
  return (
    <header className="app-header">
      <span className="muted text-sm" aria-hidden>
        Theme
      </span>
      <SegmentedControl label="Theme" value={theme} options={THEMES} onChange={(next) => void setTheme(next)} />
    </header>
  )
}
