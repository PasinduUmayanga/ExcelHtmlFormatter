import { parseMarkdown, plainText, type Block } from './markdown'

/** One Help topic as an app supplies it: an id (its address) and its Markdown, starting with "# Title". */
export interface HelpSource {
  id: string
  markdown: string
  /** Show the app's version, platform and settings file under this topic (for About) */
  appInfo?: boolean
}

export interface HelpTopic {
  id: string
  title: string
  /** The first paragraph, shown under the title on Help home */
  summary: string
  blocks: Block[]
}

/** A searchable part of a topic: the text under one ## heading (or the intro before the first one). */
export interface HelpSection {
  topic: HelpTopic
  heading: string | null
  anchor: string | null
  text: string
}

export interface HelpResult {
  section: HelpSection
  score: number
  /** A short piece of the text around the first match */
  excerpt: string
}

export function helpTopic(source: HelpSource): HelpTopic {
  const blocks = parseMarkdown(source.markdown)
  const first = blocks[0]
  const title = first?.kind === 'heading' && first.level === 1 ? first.text : source.id
  const body = first?.kind === 'heading' && first.level === 1 ? blocks.slice(1) : blocks
  const intro = body.find((b) => b.kind === 'paragraph')
  return { id: source.id, title, summary: intro ? plainText(intro.inline) : '', blocks: body }
}

const blockText = (b: Block): string =>
  b.kind === 'code' ? b.text : b.kind === 'list' ? b.items.map(plainText).join(' ') : plainText(b.inline)

/** Splits topics into sections at each ## heading. */
export function helpSections(topics: readonly HelpTopic[]): HelpSection[] {
  const sections: HelpSection[] = []
  for (const topic of topics) {
    let current: HelpSection = { topic, heading: null, anchor: null, text: '' }
    const push = () => {
      if (current.heading || current.text.trim()) sections.push({ ...current, text: current.text.trim() })
    }
    for (const block of topic.blocks) {
      if (block.kind === 'heading' && block.level === 2) {
        push()
        current = { topic, heading: block.text, anchor: block.id, text: '' }
      } else {
        current.text += ' ' + blockText(block)
      }
    }
    push()
  }
  return sections
}

/** The words of a search, lower case, ignoring single letters. */
export function searchWords(query: string): string[] {
  return [...new Set(query.toLowerCase().match(/[\p{Letter}\p{Number}]{2,}/gu) ?? [])]
}

const EXCERPT = 90

/**
 * Sections that contain every word of the query (in the topic title, heading or text), best first: words in the
 * heading or title count more than words in the text.
 */
export function searchHelp(sections: readonly HelpSection[], query: string): HelpResult[] {
  const words = searchWords(query)
  if (!words.length) return []
  const results: HelpResult[] = []
  for (const section of sections) {
    const title = `${section.topic.title} ${section.heading ?? ''}`.toLowerCase()
    const text = section.text.toLowerCase()
    if (!words.every((w) => title.includes(w) || text.includes(w))) continue
    const score = words.reduce((sum, w) => sum + (title.includes(w) ? 3 : 0) + (text.includes(w) ? 1 : 0), 0)
    const at = Math.min(...words.map((w) => text.indexOf(w)).filter((n) => n >= 0), Infinity)
    const start = at === Infinity ? 0 : Math.max(0, at - EXCERPT / 2)
    const piece = section.text.slice(start, start + EXCERPT * 2)
    const excerpt = `${start > 0 ? '…' : ''}${piece}${start + EXCERPT * 2 < section.text.length ? '…' : ''}`
    results.push({ section, score, excerpt })
  }
  return results.sort((a, b) => b.score - a.score)
}

/** Splits text into parts, marking where the search words appear (for highlighting as text). */
export function highlight(text: string, words: readonly string[]): { text: string; match: boolean }[] {
  if (!words.length) return [{ text, match: false }]
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return text
    .split(new RegExp(`(${escaped.join('|')})`, 'gi'))
    .filter(Boolean)
    .map((part) => ({ text: part, match: words.includes(part.toLowerCase()) }))
}
