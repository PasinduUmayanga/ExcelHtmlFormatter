import type { ReactNode } from 'react'
import { Link, useParams, useRouterState } from '@tanstack/react-router'
import { canVisit, useApp } from '../store'
import { useFormatterApp } from '../router'

type Step = 'open' | 'sections' | 'analysis' | 'preview'
const ORDER: Step[] = ['open', 'sections', 'analysis', 'preview']

export function Sidebar() {
  const { format } = useFormatterApp()
  const state = useApp()
  const { config, appInfo, doc, selected } = state
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const params = useParams({ strict: false }) as { section?: string }

  const current: Step | 'settings' | null = pathname.startsWith('/settings')
    ? 'settings'
    : (ORDER.find((s) => pathname.startsWith('/' + s)) ?? null)
  const currentIndex = current && current !== 'settings' ? ORDER.indexOf(current) : -1
  // Keep the section the user is looking at; otherwise start at the first selected one.
  const section = params.section && selected.includes(params.section) ? params.section : selected[0]

  const step = (id: Step, i: number, label: string, link: (children: ReactNode, className: string) => ReactNode) => {
    const done = currentIndex > i
    const enabled = id === 'open' || canVisit(state, id)
    const className = `nav ${current === id ? 'active' : ''} ${done ? 'done' : ''}`
    const children = (
      <>
        <span className="num">{done ? '✓' : i + 1}</span>
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
      <div className="brand">{format.appName}</div>
      <div className="navlabel">Workflow</div>
      {step('open', 0, 'Open file', (c, cls) => <Link key="open" to="/open" className={cls}>{c}</Link>)}
      {step('sections', 1, `Select ${format.section.plural}`, (c, cls) => <Link key="sections" to="/sections" className={cls}>{c}</Link>)}
      {step('analysis', 2, 'Tag analysis', (c, cls) => (
        <Link key="analysis" to="/analysis/$section" params={{ section: section ?? '' }} className={cls}>{c}</Link>
      ))}
      {step('preview', 3, 'Preview & export', (c, cls) => (
        <Link key="preview" to="/preview/$section" params={{ section: section ?? '' }} className={cls}>{c}</Link>
      ))}

      <div className="navlabel">Configuration</div>
      <Link to="/settings" className={`nav ${current === 'settings' ? 'active' : ''}`}>
        <span className="num">⚙</span>Tag styles
      </Link>

      <div className="side-foot">
        {doc && (
          <div title={doc.file.path} style={{ marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📄 <b>{doc.file.name}</b>
          </div>
        )}
        Profile: <b>{config?.profileName ?? '…'}</b>
        <br />
        {config ? Object.keys(config.rules).length : 0} tag rules
        {appInfo && <div style={{ color: 'var(--faint)', marginTop: 4 }}>v{appInfo.version}</div>}
      </div>
    </aside>
  )
}
