import { useEffect } from 'react'
import { getRouteApi, Link, Navigate, useNavigate } from '@tanstack/react-router'
import { useApp } from '../state/store'
import { useHelp } from '../hooks/useHelp'
import type { Block } from '../features/help/markdown'
import { Button } from '../design/atoms'
import { Markdown, type RenderLink } from '../design/molecules'
import { ScreenTemplate } from '../design/templates'

const route = getRouteApi('/help/$topic')

/** One Help topic: its sections, the text, and (for About) the app's own details. */
export function HelpTopic() {
  const { topic: id } = route.useParams()
  const { section } = route.useSearch()
  const navigate = useNavigate()
  const { topics } = useHelp()
  const appInfo = useApp((s) => s.appInfo)
  const topic = topics.find((t) => t.id === id)

  // Go to the section in the address (from search results or a link), or to the top for a new topic.
  useEffect(() => {
    const target = section ? document.getElementById(section) : null
    if (target) target.scrollIntoView({ block: 'start' })
    else document.querySelector('main')?.scrollTo?.(0, 0)
  }, [id, section])

  if (!topic) return <Navigate to="/help" search={{ q: undefined }} replace />

  // The first paragraph is the screen's intro line, so it isn't repeated in the text.
  const blocks = topic.blocks[0]?.kind === 'paragraph' ? topic.blocks.slice(1) : topic.blocks
  const headings = blocks.filter((b): b is Extract<Block, { kind: 'heading' }> => b.kind === 'heading' && b.level === 2)
  const renderLink: RenderLink = (target, children) => (
    <Link
      to="/help/$topic"
      params={{ topic: target.kind === 'topic' ? target.topic : topic.id }}
      search={{ section: target.anchor }}
    >
      {children}
    </Link>
  )

  return (
    <ScreenTemplate
      title={topic.title}
      intro={topic.summary}
      footer={<Button onClick={() => navigate({ to: '/help', search: { q: undefined } })}>← All help topics</Button>}
    >
      {headings.length > 1 && (
        <nav className="help-toc" aria-label="In this topic">
          <ul>
            {headings.map((h) => (
              <li key={h.id}>
                <Link to="/help/$topic" params={{ topic: topic.id }} search={{ section: h.id }}>
                  {h.text}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <Markdown blocks={blocks} renderLink={renderLink} />
      {topic.appInfo && appInfo && (
        <dl className="app-details">
          <dt>Version</dt>
          <dd>{appInfo.version}</dd>
          <dt>Platform</dt>
          <dd>{appInfo.platform}</dd>
          <dt>Settings file</dt>
          <dd className="code">{appInfo.configPath}</dd>
        </dl>
      )}
    </ScreenTemplate>
  )
}
