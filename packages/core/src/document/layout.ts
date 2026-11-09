import { cleanStyle, sameStyle } from '../style'
import type { TagStyle } from '../types'
import type { Block, Run } from './model'

/** Layout characters (also used by the content proof to tell layout from content). */
export const BULLETS = ['•', '◦', '▪'] as const
export const RULE_LINE = '─'.repeat(16)
export const CELL_SEPARATOR = ' │ '
const QUOTE_INDENT = '    '

export interface LayoutResult {
  runs: Run[]
  plainText: string
  /** Every piece of visible content is highlighted (→ the whole cell can be filled) */
  fullyHighlighted: boolean
}

/**
 * Lays blocks out as styled text for a single text cell (Excel, the app's preview):
 *
 * - paragraphs, headings, quotes, lists, tables and rules start on their own line
 *   (never an empty first line, never a doubled break — same rules as the original <p> handling);
 * - list items get "•  " / "◦  " / "▪  " by depth, or "1. ", with 3 spaces of indent per level;
 *   wrapped lines of an item line up under its text;
 * - quotes are indented 4 spaces; table rows go on separate lines with " │ " between cells;
 * - <hr> becomes a line of "─".
 */
export function layoutAsText(blocks: Block[]): LayoutResult {
  const writer = new TextWriter()
  writer.blocks(blocks)
  return writer.result()
}

interface Prefix {
  first: string
  rest: string
  used: boolean
}

class TextWriter {
  private runs: Run[] = []
  private text = ''
  private pendingBreak = false
  private prefixes: Prefix[] = []
  private listDepth = 0
  private cellDepth = 0
  private cellGap = false
  private contentPieces = 0
  private highlightedPieces = 0

  result(): LayoutResult {
    return {
      runs: this.runs,
      plainText: this.text,
      fullyHighlighted: this.contentPieces > 0 && this.highlightedPieces === this.contentPieces
    }
  }

  blocks(blocks: Block[]): void {
    for (const block of blocks) this.block(block)
  }

  private block(block: Block): void {
    switch (block.type) {
      case 'text':
        for (const run of block.runs) this.write(run)
        break
      case 'paragraph':
        this.requestBreak()
        this.blocks(block.children)
        this.requestBreak()
        break
      case 'quote':
        this.requestBreak()
        this.withPrefix({ first: QUOTE_INDENT, rest: QUOTE_INDENT, used: false }, () => this.blocks(block.children))
        this.requestBreak()
        break
      case 'rule':
        this.requestBreak()
        this.write({ text: RULE_LINE, style: {}, layout: true })
        this.requestBreak()
        break
      case 'list': {
        this.requestBreak()
        const depth = ++this.listDepth
        block.items.forEach((item, i) => {
          const marker = block.ordered ? `${block.start + i}.` : BULLETS[Math.min(depth, BULLETS.length) - 1]
          const first = `${marker} `.padEnd(3)
          this.requestBreak()
          this.withPrefix({ first, rest: ' '.repeat(first.length), used: false }, () => this.blocks(item))
          this.requestBreak()
        })
        this.listDepth--
        this.requestBreak()
        break
      }
      case 'table':
        this.requestBreak()
        if (block.caption.length) {
          this.blocks(block.caption)
          this.requestBreak()
        }
        for (const row of block.rows) {
          this.requestBreak()
          row.forEach((cell, i) => {
            if (i > 0) this.write({ text: CELL_SEPARATOR, style: {}, layout: true })
            this.cellDepth++
            this.cellGap = false
            this.blocks(cell.children)
            this.cellDepth--
          })
          this.requestBreak()
        }
        this.requestBreak()
        break
    }
  }

  private withPrefix(prefix: Prefix, body: () => void): void {
    this.prefixes.push(prefix)
    body()
    this.prefixes.pop()
  }

  /** Inside a table cell, structure becomes a single space; elsewhere, a pending line break. */
  private requestBreak(): void {
    if (this.cellDepth) this.cellGap = true
    else this.pendingBreak = true
  }

  private write(run: Run): void {
    if (!run.text) return
    const extras = { link: run.link, highlight: run.highlight, layout: run.layout }
    this.flushBreak(run.style, extras)
    let text = run.text
    if (this.cellDepth) {
      text = text.replace(/\n/g, ' ')
      if (this.cellGap && this.text && !/\s$/.test(this.text) && !run.layout) this.push(' ', {}, { layout: true })
      this.cellGap = false
    }
    const parts = text.includes('\n') ? text.split('\n') : [text]
    parts.forEach((part, i) => {
      if (i > 0) this.push('\n', run.style, extras)
      if (!part) return
      if (this.prefixes.length) {
        let prefix = ''
        if (this.atLineStart()) {
          prefix = this.prefixes.map((p) => (p.used ? p.rest : ((p.used = true), p.first))).join('')
        } else if (this.cellDepth) {
          // A table cell is one line: markers that have not been written yet (a list in a cell) go inline.
          prefix = this.prefixes.map((p) => (p.used ? '' : ((p.used = true), p.first))).join('')
        }
        if (prefix) this.push(prefix, {}, { layout: true })
      }
      this.push(part, run.style, extras)
      if (!run.layout && /\S/.test(part)) {
        this.contentPieces++
        if (run.highlight) this.highlightedPieces++
      }
    })
  }

  /** The line break a block asked for — never at the very start and never doubled. */
  private flushBreak(style: TagStyle, extras: Partial<Run>): void {
    if (this.pendingBreak && this.text && !this.text.endsWith('\n')) this.push('\n', style, extras)
    this.pendingBreak = false
  }

  private atLineStart(): boolean {
    return this.text === '' || this.text.endsWith('\n')
  }

  /** The style object the last run was made from: text from the same element needs no comparison. */
  private lastStyle: TagStyle | null = null

  private push(text: string, style: TagStyle, extras: Partial<Run>): void {
    this.text += text
    const prev = this.runs[this.runs.length - 1]
    if (
      prev &&
      (style === this.lastStyle || sameStyle(prev.style, style)) &&
      prev.link === extras.link &&
      !!prev.highlight === !!extras.highlight &&
      !!prev.layout === !!extras.layout
    ) {
      prev.text += text
      return
    }
    this.lastStyle = style
    const run: Run = { text, style: cleanStyle(style) }
    if (extras.link !== undefined) run.link = extras.link
    if (extras.highlight) run.highlight = true
    if (extras.layout) run.layout = true
    this.runs.push(run)
  }
}
