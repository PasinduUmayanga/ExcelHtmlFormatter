import { Link, useRouterState } from '@tanstack/react-router'
import type { ThemeChoice } from '@hf/core'
import { useApp } from '../../state/store'
import { useFormatterApp } from '../../router'
import { Icon } from '../atoms'
import { Breadcrumbs, SegmentedControl, type Crumb } from '../molecules'

const THEMES = [
  ['light', 'Light', 'sun'],
  ['dark', 'Dark', 'moon'],
  ['system', 'System', 'monitor']
] as const satisfies readonly (readonly [ThemeChoice, string, 'sun' | 'moon' | 'monitor'])[]

/** The workflow screens' names, after Home › Workspace › <format> › Format HTML tags. */
const STEP_NAMES: [RegExp, string][] = [
  [/^\/open/, 'Upload'],
  [/^\/sections/, 'Select sheets'],
  [/^\/analysis\//, 'Tag analysis'],
  [/^\/preview\//, 'Preview & export'],
  [/^\/check\//, 'Content check']
]

/** Breadcrumbs for an address (Home itself has none: the home icon is enough). */
export function crumbsFor(pathname: string, formatName: string, lastStep: string | null): Crumb[] {
  if (pathname.startsWith('/settings')) return [{ label: 'Formatting Profiles' }]
  if (pathname === '/help') return [{ label: 'Help & Support' }]
  if (pathname.startsWith('/help/')) return [{ label: 'Help & Support', to: '/help' }, { label: 'Topic' }]
  const step = STEP_NAMES.find(([pattern]) => pattern.test(pathname))
  if (!step) return []
  return [
    { label: 'Workspace', to: lastStep ?? '/open' },
    { label: formatName },
    { label: 'Format HTML tags' },
    { label: step[1] }
  ]
}

/** The bar above every screen: where you are (breadcrumbs), Help, and the theme. */
export function AppHeader() {
  const { format } = useFormatterApp()
  const { theme, setTheme, lastStep } = useApp()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const formatName = format.id.charAt(0).toUpperCase() + format.id.slice(1)
  return (
    <header className="app-header">
      <Breadcrumbs items={crumbsFor(pathname, formatName, lastStep)} />
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
