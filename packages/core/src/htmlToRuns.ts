import { tokenize } from './tokenize'
import { BUILTIN_TAGS } from './defaultRules'
import type { AppConfig, TagStyle } from './types'

/** A piece of text with one style. A cell becomes a list of runs (Excel "rich text"). */
export interface Run {
  text: string
  style: TagStyle
}

export interface ConvertResult {
  runs: Run[]
  /** Tags found in the cell that have no rule (and are not built in). */
  unknownTags: string[]
  /** True if the result contains a line break, so the cell needs "wrap text". */
  hasLineBreak: boolean
  /** The full text without formatting. */
  plainText: string
}

export type ConvertOptions = Pick<AppConfig, 'rules' | 'unknownTagAction'>

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

/**
 * Converts the HTML in one cell into styled runs.
 *
 * - Nested tags combine: <b><i>x</i></b> -> bold + italic.
 * - <br> is a line break; <p> starts a new line before and after its text.
 * - Unclosed or wrongly nested tags are tolerated (closing an outer tag also closes inner ones).
 * - Tags with no rule are removed (keeping their text) or kept as visible text, per `unknownTagAction`.
 */
export function htmlToRuns(html: string, options: ConvertOptions): ConvertResult {
  const { rules, unknownTagAction } = options
  const runs: Run[] = []
  const unknown = new Set<string>()
  const stack: { tag: string; style: TagStyle }[] = []
  let plainText = ''
  let pendingBreak = false

  const currentStyle = (): TagStyle => (stack.length ? stack[stack.length - 1].style : {})
  const isUnknown = (tag: string) => !rules[tag] && !(tag in BUILTIN_TAGS)

  const push = (text: string, style: TagStyle) => {
    plainText += text
    const prev = runs[runs.length - 1]
    if (prev && sameStyle(prev.style, style)) prev.text += text
    else runs.push({ text, style: cleanStyle(style) })
  }
  /** Adds the line break a <p> asked for, but never at the very start and never twice. */
  const flushBreak = (style: TagStyle) => {
    if (pendingBreak && plainText && !plainText.endsWith('\n')) push('\n', style)
    pendingBreak = false
  }
  const emit = (text: string, style: TagStyle) => {
    if (!text) return
    flushBreak(style)
    push(text, style)
  }

  for (const token of tokenize(html)) {
    switch (token.type) {
      case 'comment':
        break

      case 'text':
        emit(token.text, currentStyle())
        break

      case 'open': {
        const { tag } = token
        if (tag === 'br') {
          flushBreak(currentStyle())
          push('\n', currentStyle())
          break
        }
        if (tag === 'p') {
          pendingBreak = true
          if (!token.selfClosing) stack.push({ tag, style: { ...currentStyle(), ...rules.p } })
          break
        }
        const rule = rules[tag]
        if (!rule && isUnknown(tag)) {
          unknown.add(tag)
          if (unknownTagAction === 'keep') emit(token.raw, currentStyle())
        }
        if (!token.selfClosing && !VOID_TAGS.has(tag)) {
          stack.push({ tag, style: { ...currentStyle(), ...rule } })
        }
        break
      }

      case 'close': {
        const { tag } = token
        if (tag === 'br') {
          // Browsers treat a stray </br> as <br>.
          flushBreak(currentStyle())
          push('\n', currentStyle())
          break
        }
        if (isUnknown(tag)) {
          unknown.add(tag)
          if (unknownTagAction === 'keep') emit(token.raw, currentStyle())
        }
        const index = findLast(stack, tag)
        if (index !== -1) stack.length = index // also closes anything left open inside it
        if (tag === 'p') pendingBreak = true
        break
      }
    }
  }

  return {
    runs,
    unknownTags: [...unknown].sort(),
    hasLineBreak: plainText.includes('\n'),
    plainText
  }
}

function findLast(stack: { tag: string }[], tag: string): number {
  for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) return i
  return -1
}

/** Removes empty/false values so styles can be compared. */
export function cleanStyle(style: TagStyle): TagStyle {
  const out: TagStyle = {}
  for (const [key, value] of Object.entries(style) as [keyof TagStyle, unknown][]) {
    if (value !== undefined && value !== null && value !== false && value !== '') {
      ;(out as Record<string, unknown>)[key] = value
    }
  }
  return out
}

export function sameStyle(a: TagStyle, b: TagStyle): boolean {
  const ca = cleanStyle(a)
  const cb = cleanStyle(b)
  const keys = Object.keys(ca) as (keyof TagStyle)[]
  return keys.length === Object.keys(cb).length && keys.every((k) => ca[k] === cb[k])
}
