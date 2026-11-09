import { Fragment, type ReactNode } from 'react'
import type { Block, Inline, LinkTarget } from '../../help/markdown'

/** Draws a link inside Help (the screen decides how: e.g. a router link). External links never get here. */
export type RenderLink = (target: Exclude<LinkTarget, { kind: 'external' }>, children: ReactNode) => ReactNode

/**
 * Shows parsed Markdown (help/markdown.ts) as React elements. Text is always rendered as text: nothing here
 * sets HTML, so markup in the source can't run (ADR 0015).
 */
export function Markdown({ blocks, renderLink }: { blocks: readonly Block[]; renderLink: RenderLink }) {
  return (
    <div className="markdown">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'heading': {
            const Tag = block.level === 3 ? 'h3' : 'h2'
            return (
              <Tag key={i} id={block.id}>
                <Inlines nodes={block.inline} renderLink={renderLink} />
              </Tag>
            )
          }
          case 'paragraph':
            return (
              <p key={i}>
                <Inlines nodes={block.inline} renderLink={renderLink} />
              </p>
            )
          case 'list': {
            const List = block.ordered ? 'ol' : 'ul'
            return (
              <List key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inlines nodes={item} renderLink={renderLink} />
                  </li>
                ))}
              </List>
            )
          }
          case 'code':
            return (
              <pre key={i} className="code">
                {block.text}
              </pre>
            )
        }
      })}
    </div>
  )
}

function Inlines({ nodes, renderLink }: { nodes: readonly Inline[]; renderLink: RenderLink }) {
  return nodes.map((node, i) => <Fragment key={i}>{inline(node, renderLink)}</Fragment>)
}

function inline(node: Inline, renderLink: RenderLink): ReactNode {
  switch (node.kind) {
    case 'text':
      return node.text
    case 'code':
      return <code>{node.text}</code>
    case 'strong':
      return (
        <strong>
          <Inlines nodes={node.children} renderLink={renderLink} />
        </strong>
      )
    case 'em':
      return (
        <em>
          <Inlines nodes={node.children} renderLink={renderLink} />
        </em>
      )
    case 'link': {
      const children = <Inlines nodes={node.children} renderLink={renderLink} />
      // Web addresses are shown, not opened: the app never starts a browser from Help.
      if (node.target.kind === 'external') {
        return /^https?:\/\//i.test(node.target.href) ? (
          <span className="ext-link">
            {children} ({node.target.href})
          </span>
        ) : (
          children
        )
      }
      return renderLink(node.target, children)
    }
  }
}
