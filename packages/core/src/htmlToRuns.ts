import { parseDocument, type ParseOptions } from './document/parse'
import { layoutAsText } from './document/layout'
import type { Block, DocumentLink, Run } from './document/model'
import type { LinkProblem } from './links'

export { cleanStyle, sameStyle } from './style'
export type { Run } from './document/model'

export type ConvertOptions = ParseOptions

/** A link in the cell that did not become the cell's hyperlink. */
export interface SkippedLink {
  href: string
  text: string
  /** 'extra': safe, but Excel allows only one link per cell (the first safe one is used) */
  reason: LinkProblem | 'extra'
}

export interface ConvertResult {
  /** Styled text for a single cell, layout included (bullets, numbering, table separators…) */
  runs: Run[]
  /** Tags found in the cell that have no rule and no built-in behaviour. */
  unknownTags: string[]
  /** True if the result contains a line break, so the cell needs "wrap text". */
  hasLineBreak: boolean
  /** The full text without formatting. */
  plainText: string
  /** The format-neutral structure (for writers that support real lists/tables, e.g. Word later). */
  blocks: Block[]
  /** Every <a href> in the cell, in order */
  links: DocumentLink[]
  /** The cell's hyperlink: the first safe link (http, https, mailto) */
  cellLink?: string
  skippedLinks: SkippedLink[]
  /** All visible content is highlighted (<mark>, background colour) → highlight the whole cell */
  fullyHighlighted: boolean
}

/**
 * Converts the HTML in one cell into styled runs.
 *
 * - Nested tags combine: <b><i>x</i></b> -> bold + italic.
 * - <br> is a line break; <p>, headings, lists, tables, quotes and <hr> go on their own lines.
 * - Unclosed or wrongly nested tags are tolerated (closing an outer tag also closes inner ones).
 * - Tags with no rule and no built-in behaviour are removed (keeping their text) or kept as visible
 *   text, per `unknownTagAction`.
 */
export function htmlToRuns(html: string, options: ConvertOptions): ConvertResult {
  const doc = parseDocument(html, options)
  const layout = layoutAsText(doc.blocks)
  const base = {
    runs: layout.runs,
    unknownTags: doc.unknownTags,
    hasLineBreak: layout.plainText.includes('\n'),
    plainText: layout.plainText,
    blocks: doc.blocks,
    links: doc.links,
    fullyHighlighted: layout.fullyHighlighted
  }
  if (doc.links.length === 0) return { ...base, skippedLinks: [] } // the usual case
  const first = doc.links.findIndex((link) => link.check.ok)
  const firstCheck = first >= 0 ? doc.links[first].check : undefined
  return {
    ...base,
    cellLink: firstCheck?.ok ? firstCheck.href : undefined,
    skippedLinks: doc.links.flatMap((link, i) =>
      i === first ? [] : [{ href: link.href, text: link.text, reason: link.check.ok ? 'extra' : link.check.problem }]
    )
  }
}
