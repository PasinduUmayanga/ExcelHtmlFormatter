import { tokenize } from '../tokenize'
import { parseAttributes } from '../attributes'
import type { ConvertOptions, ConvertResult } from '../htmlToRuns'
import { diffWords, type DiffPart } from './diff'

/** The most characters an Excel cell can hold; longer text is cut off. */
export const MAX_CELL_TEXT = 32767

/** Words of context shown on each side of a gap. */
const CONTEXT_WORDS = 3

/** Tags that separate words: the converter puts a line break, a separator or a bullet there. */
const BOUNDARY_TAGS = new Set([
  'br', 'hr', 'p', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption'
]) // prettier-ignore

export interface ProofGap {
  /** The missing (or unexpected) words */
  text: string
  /** Up to 3 source words before and after, to find the place */
  before: string
  after: string
}

export type ProofNote =
  | { kind: 'comment'; count: number }
  | { kind: 'link'; href: string; text: string; reason: string }
  | { kind: 'image'; alt: string }
  | { kind: 'approximate' }

export interface ContentProof {
  /**
   * complete: every word of the source is in the result, in order, and nothing was added.
   * missing: source words are not in the result. changed: the result has words the source does not.
   * limit: the text is longer than an Excel cell can hold.
   */
  status: 'complete' | 'missing' | 'changed' | 'limit'
  missing: ProofGap[]
  added: ProofGap[]
  /** Lines of <pre> text whose exact spacing is not in the result */
  spacing: string[]
  /** Characters over the Excel limit (0 if within it) */
  overLimit: number
  /** Content removed on purpose (comments, images) or not linked, for the report */
  notes: ProofNote[]
}

/**
 * Proves that converting a cell lost no text: compares the words of the source (tags removed,
 * entities decoded) with the words of the result (bullets, numbers, separators and rule lines left
 * out, since the converter adds those). Whitespace differences are ignored except inside <pre>.
 */
export function proveContent(html: string, result: ConvertResult, options: ConvertOptions): ContentProof {
  const source = sourceText(html, result, options.unknownTagAction === 'keep')
  const output = contentText(result)
  const missing: ProofGap[] = []
  const added: ProofGap[] = []
  const notes: ProofNote[] = [...source.notes]
  for (const link of result.skippedLinks) notes.push({ kind: 'link', ...link })

  // Whitespace is not content (decision E8): where a word boundary falls, e.g. around a stray
  // </li>, does not matter. The word diff below is only for locating real differences, so the
  // usual case (same content) skips it and only counts words.
  const same = sameIgnoringSpace(source.text, output)
  const a = same ? [] : words(source.text)
  const b = same ? [] : words(output)
  const parts = same ? [] : diffWords(a, b)
  if (parts) {
    let index = 0 // position in the source words, for context
    for (const part of parts) {
      if (part.op === 'same') {
        index += part.items.length
        continue
      }
      const gap = {
        text: part.items.join(' '),
        before: a.slice(Math.max(0, index - CONTEXT_WORDS), index).join(' '),
        after: ''
      }
      const next = part.op === 'removed' ? index + part.items.length : index
      gap.after = a.slice(next, next + CONTEXT_WORDS).join(' ')
      if (part.op === 'removed') {
        missing.push(gap)
        index = next
      } else {
        added.push(gap)
      }
    }
  } else {
    // Too different to align cheaply: compare word counts instead (order is not checked).
    notes.push({ kind: 'approximate' })
    const counts = new Map<string, number>()
    for (const w of a) counts.set(w, (counts.get(w) ?? 0) + 1)
    for (const w of b) counts.set(w, (counts.get(w) ?? 0) - 1)
    for (const [w, count] of counts) {
      for (let i = 0; i < Math.abs(count); i++) (count > 0 ? missing : added).push({ text: w, before: '', after: '' })
    }
  }

  const spacing = source.preLines.filter((line) => !result.plainText.includes(line))
  const overLimit = Math.max(0, result.plainText.length - MAX_CELL_TEXT)
  const status =
    missing.length || spacing.length ? 'missing' : added.length ? 'changed' : overLimit ? 'limit' : 'complete'
  return { status, missing, added, spacing, overLimit, notes }
}

/** The result's text without the layout the converter adds (bullets, numbers, separators). */
const contentText = (result: ConvertResult) =>
  result.runs.some((run) => run.layout)
    ? result.runs.map((run) => (run.layout ? ' ' : run.text)).join('')
    : result.plainText

/** Splits text into words (any whitespace separates them). */
export const words = (text: string) => text.split(/\s+/).filter(Boolean)

/**
 * The word-by-word comparison behind a proof, for showing a reader where text went missing:
 * 'removed' words are in the source but not the result, 'added' the other way round.
 * Null if the texts are too different to align (see diffWords).
 */
export function contentDiff(html: string, result: ConvertResult, options: ConvertOptions): DiffPart[] | null {
  const source = sourceText(html, result, options.unknownTagAction === 'keep')
  return diffWords(words(source.text), words(contentText(result)))
}
/** Whitespace as JavaScript's \s defines it. */
const SPACE = /\s/
const isSpace = (code: number) =>
  code === 32 || (code >= 9 && code <= 13) || (code > 127 && SPACE.test(String.fromCharCode(code)))

/** True if the texts are equal once all whitespace is removed (without building the stripped copies). */
export function sameIgnoringSpace(a: string, b: string): boolean {
  let i = 0
  let j = 0
  for (;;) {
    while (i < a.length && isSpace(a.charCodeAt(i))) i++
    while (j < b.length && isSpace(b.charCodeAt(j))) j++
    if (i === a.length || j === b.length) return i === a.length && j === b.length
    if (a.charCodeAt(i) !== b.charCodeAt(j)) return false
    i++
    j++
  }
}

/**
 * The text a reader of the source would expect to see, built independently of the converter:
 * text between tags, a space where a structural tag separates words, and the tags themselves when
 * unknown tags are kept as text.
 */
function sourceText(html: string, result: ConvertResult, keep: boolean) {
  const unknown = new Set(result.unknownTags)
  let text = ''
  let comments = 0
  const notes: ProofNote[] = []
  const preLines: string[] = []
  let pre: string | null = null
  let preDepth = 0
  for (const token of tokenize(html)) {
    if (token.type === 'comment') {
      comments++
      continue
    }
    if (token.type === 'text') {
      text += token.text
      if (pre !== null) pre += token.text
      continue
    }
    const { tag } = token
    if (keep && unknown.has(tag) && tag !== 'br') {
      text += token.raw
      if (pre !== null) pre += token.raw
    }
    if (BOUNDARY_TAGS.has(tag)) text += ' '
    if (tag === 'br' && pre !== null) pre += '\n'
    if (token.type === 'open' && tag === 'img') {
      const alt = parseAttributes(token.raw).alt?.trim()
      if (alt) notes.push({ kind: 'image', alt })
    }
    if (tag === 'pre' && token.type === 'open' && !token.selfClosing) {
      if (preDepth++ === 0) pre = ''
    } else if (tag === 'pre' && token.type === 'close' && preDepth > 0 && --preDepth === 0) {
      preLines.push(...preLinesOf(pre ?? ''))
      pre = null
    }
  }
  if (pre !== null) preLines.push(...preLinesOf(pre))
  if (comments) notes.unshift({ kind: 'comment', count: comments })
  return { text, notes, preLines }
}

/** Lines of <pre> text worth checking: inner spacing matters, the edges are trimmed by layout. */
const preLinesOf = (text: string) =>
  text
    .split('\n')
    .map((line) => line.replace(/^\s+|\s+$/g, ''))
    .filter((line) => /\s/.test(line))
