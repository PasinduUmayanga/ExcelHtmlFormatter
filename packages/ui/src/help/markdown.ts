/**
 * A small Markdown parser for the Help Center (ADR 0015). It produces data, never HTML: the Markdown molecule
 * turns it into React elements, so any HTML in the text is shown as text. Supported: # headings (1–3), paragraphs,
 * - / * / 1. lists (one level), **bold**, *italic* / _italic_, `code`, ``` code blocks and [links](target).
 * Anything else is kept as plain text.
 */

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'strong'; children: Inline[] }
  | { kind: 'em'; children: Inline[] }
  | { kind: 'link'; target: LinkTarget; children: Inline[] }

/** Where a link goes. Only links inside Help are followed; others are shown as text (no browser is opened). */
export type LinkTarget =
  | { kind: 'topic'; topic: string; anchor?: string }
  | { kind: 'anchor'; anchor: string }
  | { kind: 'external'; href: string }

export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; id: string; text: string; inline: Inline[] }
  | { kind: 'paragraph'; inline: Inline[] }
  | { kind: 'list'; ordered: boolean; items: Inline[][] }
  | { kind: 'code'; text: string }

/** A heading's anchor: lower case, letters and digits joined by hyphens ("Line breaks & wrap" → "line-breaks-wrap"). */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Where a link points. "user-guide.md#saving" → topic user-guide, anchor saving (the same links work on GitHub).
 * "#saving" → this topic. Anything else (http:, mailto:, javascript:…) is external and never followed.
 */
export function linkTarget(href: string): LinkTarget {
  const topic = /^(?:\.\/)?([a-z0-9-]+)\.md(?:#([a-z0-9-]+))?$/i.exec(href)
  if (topic) return { kind: 'topic', topic: topic[1].toLowerCase(), anchor: topic[2]?.toLowerCase() }
  const anchor = /^#([a-z0-9-]+)$/i.exec(href)
  if (anchor) return { kind: 'anchor', anchor: anchor[1].toLowerCase() }
  return { kind: 'external', href }
}

/** Inline formatting of one paragraph, list item or heading. Unclosed markers stay as text. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = []
  let plain = ''
  const flush = () => {
    if (plain) out.push({ kind: 'text', text: plain })
    plain = ''
  }
  let i = 0
  while (i < text.length) {
    const rest = text.slice(i)
    if (rest[0] === '\\' && rest.length > 1 && /[\\`*_[\]()#-]/.test(rest[1])) {
      plain += rest[1]
      i += 2
      continue
    }
    let m: RegExpExecArray | null
    if ((m = /^`([^`]+)`/.exec(rest))) {
      flush()
      out.push({ kind: 'code', text: m[1] })
    } else if ((m = /^\*\*(?=\S)([\s\S]*?\S)\*\*/.exec(rest))) {
      flush()
      out.push({ kind: 'strong', children: parseInline(m[1]) })
    } else if ((m = /^([*_])(?=\S)([\s\S]*?\S)\1(?![*_\p{Letter}\p{Number}])/u.exec(rest))) {
      flush()
      out.push({ kind: 'em', children: parseInline(m[2]) })
    } else if ((m = /^\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/.exec(rest))) {
      flush()
      out.push({ kind: 'link', target: linkTarget(m[2]), children: parseInline(m[1]) })
    } else {
      plain += rest[0]
      i += 1
      continue
    }
    i += m[0].length
  }
  flush()
  return out
}

/** The text of inline content without formatting (for search and anchors). */
export function plainText(inline: readonly Inline[]): string {
  return inline.map((n) => ('text' in n ? n.text : plainText(n.children))).join('')
}

const LIST_ITEM = /^\s{0,3}(?:([-*])|(\d{1,3})\.)\s+(.*)$/

/** Splits a Markdown document into blocks. Never throws; unknown syntax becomes paragraph text. */
export function parseMarkdown(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  const used = new Map<string, number>()
  const uniqueId = (text: string) => {
    const base = slug(text) || 'section'
    const n = used.get(base) ?? 0
    used.set(base, n + 1)
    return n ? `${base}-${n}` : base
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    if (/^\s{0,3}```/.test(line)) {
      const body: string[] = []
      i++
      while (i < lines.length && !/^\s{0,3}```/.test(lines[i])) body.push(lines[i++])
      i++ // closing fence (or end of text)
      blocks.push({ kind: 'code', text: body.join('\n') })
      continue
    }
    const heading = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line)
    if (heading) {
      const inline = parseInline(heading[2])
      const text = plainText(inline)
      blocks.push({ kind: 'heading', level: heading[1].length as 1 | 2 | 3, id: uniqueId(text), text, inline })
      i++
      continue
    }
    const first = LIST_ITEM.exec(line)
    if (first) {
      const ordered = first[2] !== undefined
      const items: string[] = []
      while (i < lines.length) {
        const item = LIST_ITEM.exec(lines[i])
        if (item && (item[2] !== undefined) === ordered) {
          items.push(item[3])
          i++
        } else if (lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && items.length) {
          items[items.length - 1] += ' ' + lines[i].trim() // continuation of the item above
          i++
        } else break
      }
      blocks.push({ kind: 'list', ordered, items: items.map(parseInline) })
      continue
    }
    const text: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s/.test(lines[i]) &&
      !/^\s{0,3}```/.test(lines[i]) &&
      !LIST_ITEM.test(lines[i])
    ) {
      text.push(lines[i++].trim())
    }
    blocks.push({ kind: 'paragraph', inline: parseInline(text.join(' ')) })
  }
  return blocks
}
