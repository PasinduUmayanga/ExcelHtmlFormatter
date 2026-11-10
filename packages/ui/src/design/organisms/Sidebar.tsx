import { Link, useRouterState } from '@tanstack/react-router'
import { useApp } from '../../state/store'
import { useFormatterApp } from '../../router'
import { cx } from '../../utils/cx'
import { Icon, Logo, type IconName } from '../atoms'

type Step = 'upload' | 'configure' | 'preview' | 'complete'
const ORDER: Step[] = ['upload', 'configure', 'preview', 'complete']
type Place =
  | Step
  | 'home'
  | 'workspace'
  | 'recent'
  | 'favorites'
  | 'templates'
  | 'automation'
  | 'settings'
  | 'profiles'
  | 'help'
  | null

/** Where the address is: a workflow step or one of the global pages. */
function placeOf(pathname: string): Place {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/settings')) return 'profiles'
  if (pathname === '/workspace') return 'workspace'
  if (pathname === '/recent') return 'recent'
  if (pathname === '/favorites') return 'favorites'
  if (pathname === '/templates') return 'templates'
  if (pathname === '/automation') return 'automation'
  if (pathname === '/preferences') return 'settings'
  if (pathname.startsWith('/help')) return 'help'
  // The content check (/check) belongs to the Preview & export step.
  if (pathname.startsWith('/check')) return 'preview'
  return ORDER.find((s) => pathname.startsWith('/' + s)) ?? null
}

/**
 * The global navigation, grouped as in the "Reference-Matched" prototype: Home, My Workspace, Recent Files,
 * Favorites; Tools; Settings; and the active profile at the bottom. The workflow's steps are in its own stepper (WorkflowStepper).
 */
export function Sidebar() {
  const { format } = useFormatterApp()
  const state = useApp()
  const { config, appInfo, doc, workflowActive } = state
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const place = placeOf(pathname)
  const inWorkflow = place !== null && (ORDER as string[]).includes(place)

  const item = (icon: IconName, label: string) => (
    <>
      <Icon name={icon} size={18} />
      <span>{label}</span>
    </>
  )
  // The current page is announced by aria-current, so link names stay "Home", "Help & Support"…
  const current = (on: boolean) => (on ? ('page' as const) : undefined)

  return (
    <aside>
      <div className="brand">
        <Logo size={35} />
        <div>
          <div className="brand-name">{format.appName}</div>
          {format.tagline && <div className="brand-tagline">{format.tagline}</div>}
        </div>
      </div>

      <nav className="nav-group" aria-label="Main">
        <Link to="/" className={cx('nav', place === 'home' && 'active')} aria-current={current(place === 'home')}>
          {item('home', 'Home')}
        </Link>
        <Link
          to="/workspace"
          className={cx('nav', (place === 'workspace' || inWorkflow) && 'active')}
          aria-current={current(place === 'workspace' || inWorkflow)}
        >
          {item('workspace', 'My Workspace')}
          {workflowActive && <span className="nav-soon live">Active</span>}
        </Link>
        <Link
          to="/recent"
          className={cx('nav', place === 'recent' && 'active')}
          aria-current={current(place === 'recent')}
        >
          {item('recent', 'Recent Files')}
        </Link>
        <Link
          to="/favorites"
          className={cx('nav', place === 'favorites' && 'active')}
          aria-current={current(place === 'favorites')}
        >
          {item('favorites', 'Favorites')}
        </Link>
      </nav>

      <hr className="nav-rule" />
      <div className="navlabel" id="nav-tools">
        Tools
      </div>
      <nav className="nav-group" aria-labelledby="nav-tools">
        <Link
          to="/settings"
          search={{ tag: undefined, back: undefined }}
          className={cx('nav', place === 'profiles' && 'active')}
          aria-current={current(place === 'profiles')}
        >
          {item('profiles', 'Formatting Profiles')}
        </Link>
        <Link
          to="/automation"
          className={cx('nav', place === 'automation' && 'active')}
          aria-current={current(place === 'automation')}
        >
          {item('automation', 'Automation')}
          <span className="nav-soon">Beta</span>
        </Link>
        <Link
          to="/templates"
          className={cx('nav', place === 'templates' && 'active')}
          aria-current={current(place === 'templates')}
        >
          {item('templates', 'Templates')}
        </Link>
      </nav>

      <hr className="nav-rule" />
      <div className="navlabel" id="nav-settings">
        Settings
      </div>
      <nav className="nav-group" aria-labelledby="nav-settings">
        <Link
          to="/preferences"
          className={cx('nav', place === 'settings' && 'active')}
          aria-current={current(place === 'settings')}
        >
          {item('settings', 'Settings')}
        </Link>
        <Link
          to="/help"
          search={{ q: undefined }}
          className={cx('nav', place === 'help' && 'active')}
          aria-current={current(place === 'help')}
        >
          {item('help', 'Help & Support')}
        </Link>
      </nav>

      <div className="profile-card" role="status" aria-label="Active formatting profile">
        <div className="profile-head">
          <span className="profile-dot" aria-hidden="true" />
          <b>{config?.profileName ?? '…'} Profile</b>
        </div>
        <div className="profile-detail">
          {config ? Object.keys(config.rules).length : 0} tag rules
          {appInfo && ` · v${appInfo.version}`}
        </div>
        {doc && (
          <div className="profile-detail truncate" title={doc.file.path}>
            <Icon name="file" size={12} /> {doc.file.name}
          </div>
        )}
      </div>
    </aside>
  )
}
