import { tokenize } from '../tokenize'
import { parseAttributes } from '../attributes'
import { parseInlineStyle, type InlineStyle } from '../inlineStyle'
import { checkLink } from '../links'
import { builtinStyle, isBuiltin } from '../defaultRules'
import type { AppConfig, TagStyle } from '../types'
import type { Block, DocumentLink, ParagraphKind, ParsedDocument, Run, TableCell } from './model'

export type ParseOptions = Pick<AppConfig, 'rules' | 'unknownTagAction'>

/** Tags that never have a closing tag. */
const VOID_TAGS = new Set([
  'br',
  'hr',
  'img',
  'input',
  'wbr',
  'meta',
  'link',
  'col',
  'area',
  'base',
  'embed',
  'source',
  'track',
  'param'
])

const PARAGRAPH_KINDS = new Set<string>(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre'])
const TABLE_PARTS = new Set(['thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption'])

/**
 * Inside these (new, structural) elements, whitespace from the source is insignificant, as in HTML:
 * runs of spaces/newlines collapse to one space and are trimmed at block edges. Outside them,
 * text is kept exactly as before (cells using only the original tags convert identically).
 */
const NORMALIZING = new Set([
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'caption',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6'
])

/** Browser-like implicit closing for sloppy HTML: opening `tag` closes an open `closes` element, unless a `stopAt` element comes first. */
const AUTO_CLOSE: Record<string, { closes: string[]; stopAt: string[] }> = {
  li: { closes: ['li'], stopAt: ['ul', 'ol'] },
  tr: { closes: ['tr', 'td', 'th'], stopAt: ['table', 'thead', 'tbody', 'tfoot'] },
  td: { closes: ['td', 'th'], stopAt: ['tr', 'table'] },
  th: { closes: ['td', 'th'], stopAt: ['tr', 'table'] },
  thead: { closes: ['thead', 'tbody', 'tfoot', 'tr', 'td', 'th'], stopAt: ['table'] },
  tbody: { closes: ['thead', 'tbody', 'tfoot', 'tr', 'td', 'th'], stopAt: ['table'] },
  tfoot: { closes: ['thead', 'tbody', 'tfoot', 'tr', 'td', 'th'], stopAt: ['table'] }
}

interface ElementNode {
  kind: 'element'
  tag: string
  raw: string
  attrs: Record<string, string>
  children: Node[]
  /** The closing tag's text, if the element was closed explicitly */
  closeRaw?: string
}
type Node = ElementNode | { kind: 'text'; text: string } | { kind: 'raw'; text: string }

/** What applies to the content of an element. */
interface Context {
  style: TagStyle
  link?: number
  highlight?: boolean
  /** Collapse insignificant whitespace (inside the structural tags) */
  normalize: boolean
}

/**
 * Parses the HTML of one cell into format-neutral blocks with resolved styles (ADR 0009).
 * Forgiving: never throws, whatever the input.
 */
export function parseDocument(html: string, options: ParseOptions): ParsedDocument {
  const { rules, unknownTagAction } = options
  const keep = unknownTagAction === 'keep'
  const ruleFor = (tag: string): TagStyle | undefined => (Object.hasOwn(rules, tag) ? rules[tag] : undefined)
  // Each tag is looked up several times per cell (open, close, layout); remember the answer.
  const unknownCache = new Map<string, boolean>()
  const isUnknown = (tag: string) => {
    let unknown = unknownCache.get(tag)
    if (unknown === undefined) unknownCache.set(tag, (unknown = ruleFor(tag) === undefined && !isBuiltin(tag)))
    return unknown
  }
  const unknown = new Set<string>()
  const links: DocumentLink[] = []
  const hardBreaks = new WeakSet<Run>()

  /* ---------- 1. tokens → element tree ---------- */

  const root: ElementNode = { kind: 'element', tag: '#root', raw: '', attrs: {}, children: [] }
  const stack: ElementNode[] = [root]
  const top = () => stack[stack.length - 1]

  for (const token of tokenize(html)) {
    if (token.type === 'comment') continue
    if (token.type === 'text') {
      top().children.push({ kind: 'text', text: token.text })
      continue
    }
    const { tag } = token
    if (token.type === 'open') {
      if (tag !== 'br' && isUnknown(tag)) unknown.add(tag)
      autoClose(stack, tag)
      const el: ElementNode = { kind: 'element', tag, raw: token.raw, attrs: attributesOf(token.raw), children: [] }
      top().children.push(el)
      if (!token.selfClosing && !VOID_TAGS.has(tag)) stack.push(el)
      continue
    }
    // closing tag
    if (tag === 'br') {
      // Browsers treat a stray </br> as <br>.
      top().children.push({ kind: 'element', tag: 'br', raw: '<br>', attrs: {}, children: [] })
      continue
    }
    const unknownTag = isUnknown(tag)
    if (unknownTag) unknown.add(tag)
    const index = findOpen(stack, tag)
    if (index > 0) {
      stack[index].closeRaw = token.raw
      stack.length = index // also closes anything left open inside it
    } else if (unknownTag && keep) {
      top().children.push({ kind: 'raw', text: token.raw })
    }
  }

  /* ---------- 2. element tree → blocks ---------- */

  /** The context for an element's content: style (parent → rule/built-in → inline style), link, highlight. */
  function enter(el: ElementNode, ctx: Context): Context {
    const base = ruleFor(el.tag) ?? builtinStyle(el.tag) ?? {}
    const { highlight, ...inline } = el.attrs.style ? parseInlineStyle(el.attrs.style) : NO_INLINE_STYLE
    const next: Context = {
      style: { ...ctx.style, ...base, ...inline },
      link: ctx.link,
      highlight: highlight === undefined ? ctx.highlight : highlight,
      normalize: el.tag === 'pre' ? false : ctx.normalize || NORMALIZING.has(el.tag)
    }
    if (el.tag === 'mark') next.highlight = true
    if (el.tag === 'a' && el.attrs.href !== undefined) {
      next.link = links.length
      links.push({ href: el.attrs.href, text: textOf(el).trim(), check: checkLink(el.attrs.href) })
    }
    return next
  }

  function inline(out: Block[], text: string, ctx: Context, hardBreak = false): void {
    const value = ctx.normalize && !hardBreak ? text.replace(/[ \t\r\n\f]+/g, ' ') : text
    if (!value) return
    const run: Run = { text: value, style: ctx.style }
    if (ctx.link !== undefined) run.link = ctx.link
    if (ctx.highlight) run.highlight = true
    if (hardBreak) hardBreaks.add(run)
    add(out, { type: 'text', runs: [run] })
  }

  function blocksOf(nodes: Node[], ctx: Context): Block[] {
    const out: Block[] = []
    for (const node of nodes) appendNode(out, node, ctx)
    return ctx.normalize ? trimBlocks(out, hardBreaks) : out
  }

  function appendNode(out: Block[], node: Node, ctx: Context): void {
    if (node.kind !== 'element') return inline(out, node.text, ctx)
    const { tag } = node
    if (tag === 'br') return inline(out, '\n', ctx, true)
    const unknownTag = isUnknown(tag)
    if (unknownTag && keep) inline(out, node.raw, ctx)
    const inner = enter(node, ctx)

    if (PARAGRAPH_KINDS.has(tag)) {
      add(out, { type: 'paragraph', kind: tag as ParagraphKind, children: blocksOf(node.children, inner) })
    } else if (tag === 'blockquote') {
      add(out, { type: 'quote', children: blocksOf(node.children, inner) })
    } else if (tag === 'ul' || tag === 'ol') {
      add(out, listOf(node, inner))
    } else if (tag === 'li') {
      // A list item outside a list: treat it as a one-item bulleted list.
      add(out, { type: 'list', ordered: false, start: 1, items: [blocksOf(node.children, inner)] })
    } else if (tag === 'table' || TABLE_PARTS.has(tag)) {
      add(out, tableOf(node, tag === 'table' ? inner : { ...ctx, normalize: true }))
    } else if (tag === 'hr') {
      add(out, { type: 'rule' })
    } else {
      for (const child of node.children) appendNode(out, child, inner)
    }

    if (unknownTag && keep && node.closeRaw) inline(out, node.closeRaw, ctx)
  }

  function listOf(list: ElementNode, ctx: Context): Block {
    const ordered = list.tag === 'ol'
    const start = ordered ? parseInt(list.attrs.start ?? '', 10) : NaN
    const items: Block[][] = []
    for (const child of list.children) {
      if (child.kind !== 'element') {
        if (child.text.trim()) items.push(blocksOf([child], ctx))
        continue
      }
      if (child.tag === 'li') {
        items.push(blocksOf(child.children, enter(child, ctx)))
      } else if ((child.tag === 'ul' || child.tag === 'ol') && items.length) {
        // A list directly inside a list (common in hand-written HTML) belongs to the previous item.
        items[items.length - 1].push(listOf(child, enter(child, ctx)))
      } else {
        const blocks = blocksOf([child], ctx)
        if (blocks.length) items.push(blocks)
      }
    }
    return { type: 'list', ordered, start: Number.isFinite(start) ? start : 1, items }
  }

  function tableOf(el: ElementNode, ctx: Context): Block {
    const rows: TableCell[][] = []
    const caption: Block[] = []
    let row: TableCell[] | null = null
    const currentRow = () => row ?? (rows.push((row = [])), row)

    const visit = (nodes: Node[], c: Context) => {
      for (const node of nodes) {
        if (node.kind !== 'element') {
          if (node.text.trim()) currentRow().push({ header: false, children: blocksOf([node], c) })
          continue
        }
        switch (node.tag) {
          case 'table':
            visit(node.children, enter(node, c))
            break
          case 'thead':
          case 'tbody':
          case 'tfoot':
            row = null
            visit(node.children, enter(node, c))
            row = null
            break
          case 'tr':
            row = []
            rows.push(row)
            visit(node.children, enter(node, c))
            row = null
            break
          case 'td':
          case 'th':
            currentRow().push({ header: node.tag === 'th', children: blocksOf(node.children, enter(node, c)) })
            break
          case 'caption':
            caption.push(...blocksOf(node.children, enter(node, c)))
            break
          case 'colgroup':
          case 'col':
            break
          default:
            currentRow().push({ header: false, children: blocksOf([node], c) })
        }
      }
    }
    visit([el], ctx)
    return { type: 'table', caption, rows }
  }

  const blocks = blocksOf(root.children, { style: {}, normalize: false })
  return { blocks, links, unknownTags: [...unknown].sort() }
}

/** Adds a block, joining consecutive inline text blocks. */
function add(out: Block[], block: Block): void {
  const last = out[out.length - 1]
  if (block.type === 'text' && last?.type === 'text') last.runs.push(...block.runs)
  else out.push(block)
}

/**
 * HTML-like whitespace at block edges: whitespace-only text next to blocks is dropped, and text is
 * trimmed where it meets a block or the start/end of its container. Line breaks from <br> are kept.
 */
function trimBlocks(blocks: Block[], hardBreaks: WeakSet<Run>): Block[] {
  const out: Block[] = []
  blocks.forEach((block, i) => {
    if (block.type !== 'text') return out.push(block)
    const atStart = i === 0 || blocks[i - 1].type !== 'text'
    const atEnd = i === blocks.length - 1 || blocks[i + 1].type !== 'text'
    // Runs are created fresh by the parser, so they can be edited in place (keeps <br> markers valid).
    const runs = block.runs.slice()
    if (atStart) {
      while (runs.length && !hardBreaks.has(runs[0])) {
        runs[0].text = runs[0].text.replace(/^\s+/, '')
        if (runs[0].text) break
        runs.shift()
      }
    }
    if (atEnd) {
      while (runs.length && !hardBreaks.has(runs[runs.length - 1])) {
        const last = runs[runs.length - 1]
        last.text = last.text.replace(/\s+$/, '')
        if (last.text) break
        runs.pop()
      }
    }
    if (runs.length) out.push({ type: 'text', runs })
  })
  return out
}

function findOpen(stack: ElementNode[], tag: string): number {
  for (let i = stack.length - 1; i > 0; i--) if (stack[i].tag === tag) return i
  return -1
}

function autoClose(stack: ElementNode[], tag: string): void {
  if (!Object.hasOwn(AUTO_CLOSE, tag)) return // not `AUTO_CLOSE[tag]`: "constructor" is a valid tag name
  const rule = AUTO_CLOSE[tag]
  for (let i = stack.length - 1; i > 0; i--) {
    const open = stack[i].tag
    if (rule.stopAt.includes(open)) return
    if (rule.closes.includes(open)) {
      stack.length = i
      return
    }
  }
}

function textOf(node: Node): string {
  if (node.kind !== 'element') return node.kind === 'text' ? node.text : ''
  return node.children.map(textOf).join('')
}

const NO_ATTRIBUTES: Record<string, string> = Object.freeze(Object.create(null))
const NO_INLINE_STYLE: InlineStyle = Object.freeze({})

/** Most tags have no attributes (`<b>`); skipping the attribute parser for them roughly halves parse time. */
const attributesOf = (raw: string) => (/^<[a-zA-Z][a-zA-Z0-9-]*\/?>$/.test(raw) ? NO_ATTRIBUTES : parseAttributes(raw))
