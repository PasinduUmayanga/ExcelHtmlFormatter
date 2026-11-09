import type { MouseEvent, ReactNode } from 'react'
import { Link, useParams, useRouter, useRouterState } from '@tanstack/react-router'
import { canVisit, useApp } from '../../state/store'
import { useFormatterApp } from '../../router'
import { cx } from '../../utils/cx'
import { Icon, Logo, type IconName } from '../atoms'

type Step = 'open' | 'sections' | 'analysis' | 'preview'
const ORDER: Step[] = ['open', 'sections', 'analysis', 'preview']
type Place = Step | 'home' | 'profiles' | 'help' | null

/** Where the address is: a workflow step or one of the global pages. */
function placeOf(pathname: string): Place {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/settings')) return 'profiles'
  if (pathname.startsWith('/help')) return 'help'
  // The content check (/check) belongs to the Preview & export step.
  if (pathname.startsWith('/check')) return 'preview'
  return ORDER.find((s) => pathname.startsWith('/' + s)) ?? null
}

/**
 * The global navigation (redesign §4): Home, My Workspace (the active workflow), Formatting Profiles, Help & Support,
 * and, while the workflow is still shown here, its steps. Recent Files and Settings join when their pages exist.
 */
export function Sidebar() {
  const { format } = useFormatterApp()
  const state = useApp()
  const { config, appInfo, doc, selected, workflowActive, lastStep } = state
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const params = useParams({ strict: false }) as { section?: string }
  const place = placeOf(pathname)
  const inWorkflow = place !== null && (ORDER as string[]).includes(place)
  const currentIndex = inWorkflow ? ORDER.indexOf(place as Step) : -1
  // Keep the section the user is looking at; otherwise start at the first selected one.
  const section = params.section && selected.includes(params.section) ? params.section : selected[0]

  const item = (icon: IconName, label: string) => (
    <>
      <Icon name={icon} size={20} />
      <span>{label}</span>
    </>
  )
  // The current page is announced by aria-current, so link names stay "Home", "Help & Support"…
  const current = (on: boolean) => (on ? ('page' as const) : undefined)

  // My Workspace returns to the active workflow: the last screen of the open file, or the Open screen.
  const workspace = lastStep ?? '/open'
  const openWorkspace = (e: MouseEvent) => {
    e.preventDefault()
    router.history.push(workspace)
  }

  const step = (id: Step, i: number, label: string, link: (children: ReactNode, className: string) => ReactNode) => {
    const done = currentIndex > i
    // Locked until the workflow is started from Home (and again after a clean save).
    const enabled = id === 'open' ? workflowActive : canVisit(state, id)
    const className = cx('nav', 'step', place === id && 'active', done && 'done')
    const children = (
      <>
        <span className="num">{done ? <Icon name="check" size={14} /> : i + 1}</span>
        {label}
      </>
    )
    return enabled ? (
      link(children, className)
    ) : (
      <span key={id} className={className} aria-disabled="true">
        {children}
      </span>
    )
  }

  return (
    <aside>
      <div className="brand">
        <Logo size={36} />
        <div>
          <div className="brand-name">{format.appName}</div>
          {format.tagline && <div className="brand-tagline">{format.tagline}</div>}
        </div>
      </div>

      <nav className="nav-group" aria-label="Main">
        <Link to="/" className={cx('nav', place === 'home' && 'active')} aria-current={current(place === 'home')}>
          {item('home', 'Home')}
        </Link>
        {workflowActive ? (
          <a
            href={`#${workspace}`}
            onClick={openWorkspace}
            className={cx('nav', inWorkflow && 'active')}
            aria-current={current(inWorkflow)}
          >
            {item('workspace', 'My Workspace')}
          </a>
        ) : (
          <span className="nav" aria-disabled="true" title="Start from Home to open a workspace">
            {item('workspace', 'My Workspace')}
          </span>
        )}
        <Link
          to="/settings"
          search={{ tag: undefined, back: undefined }}
          className={cx('nav', place === 'profiles' && 'active')}
          aria-current={current(place === 'profiles')}
        >
          {item('profiles', 'Formatting Profiles')}
        </Link>
      </nav>

      <div className="navlabel">Workflow</div>
      <nav className="nav-group" aria-label="Workflow steps">
        {step('open', 0, 'Open file', (c, cls) => (
          <Link key="open" to="/open" className={cls}>
            {c}
          </Link>
        ))}
        {step('sections', 1, `Select ${format.section.plural}`, (c, cls) => (
          <Link key="sections" to="/sections" className={cls}>
            {c}
          </Link>
        ))}
        {step('analysis', 2, 'Tag analysis', (c, cls) => (
          <Link key="analysis" to="/analysis/$section" params={{ section: section ?? '' }} className={cls}>
            {c}
          </Link>
        ))}
        {step('preview', 3, 'Preview & export', (c, cls) => (
          <Link key="preview" to="/preview/$section" params={{ section: section ?? '' }} className={cls}>
            {c}
          </Link>
        ))}
      </nav>

      <hr className="nav-rule" />
      <nav className="nav-group" aria-label="Support">
        <Link
          to="/help"
          search={{ q: undefined }}
          className={cx('nav', place === 'help' && 'active')}
          aria-current={current(place === 'help')}
        >
          {item('help', 'Help & Support')}
        </Link>
      </nav>

      <div className="side-foot">
        {doc && (
          <div title={doc.file.path} className="truncate side-file">
            <Icon name="file" /> <b>{doc.file.name}</b>
          </div>
        )}
        <div>
          Profile: <b>{config?.profileName ?? '…'}</b>
        </div>
        <div>{config ? Object.keys(config.rules).length : 0} tag rules</div>
        {appInfo && (
          <div className="side-version">
            <Icon name="info" size={14} /> {format.appName} v{appInfo.version}
          </div>
        )}
      </div>
    </aside>
  )
}
