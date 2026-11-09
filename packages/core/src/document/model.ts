import type { TagStyle } from '../types'
import type { LinkCheck } from '../links'

/**
 * Format-neutral document model (ADR 0009). The HTML of one cell (or, later, one Word paragraph)
 * is parsed into blocks; each target then lays the blocks out its own way:
 * Excel and the preview as text in one cell (layout.ts), Word/PDF later as real lists and tables.
 */

/** A piece of text with one resolved style. */
export interface Run {
  text: string
  style: TagStyle
  /** Index into ParsedDocument.links when the text is inside an <a href> */
  link?: number
  /** Inside <mark> or an element with a background colour */
  highlight?: boolean
  /** Text the layout added (bullets, numbers, table separators, lines) — not from the source */
  layout?: boolean
}

export type ParagraphKind = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'pre'

export type Block =
  /** Inline content with no line breaks around it */
  | { type: 'text'; runs: Run[] }
  /** Starts and ends on its own line */
  | { type: 'paragraph'; kind: ParagraphKind; children: Block[] }
  | { type: 'quote'; children: Block[] }
  | { type: 'list'; ordered: boolean; start: number; items: Block[][] }
  | { type: 'table'; caption: Block[]; rows: TableCell[][] }
  | { type: 'rule' }

export interface TableCell {
  header: boolean
  children: Block[]
}

export interface DocumentLink {
  href: string
  /** The link's visible text */
  text: string
  check: LinkCheck
}

export interface ParsedDocument {
  blocks: Block[]
  links: DocumentLink[]
  /** Tags with no rule and no built-in behaviour */
  unknownTags: string[]
}
