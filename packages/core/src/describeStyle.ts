import { BUILTIN_TAGS } from './defaultRules'
import type { TagStyle } from './types'

/** True if the tag has a rule, or is handled by the app itself (br, p). */
export function isConfigured(tag: string, rules: Record<string, TagStyle>): boolean {
  return tag in BUILTIN_TAGS || Boolean(rules[tag])
}

export interface StyleDescription {
  /** Readable parts, e.g. ["Bold", "Italic", "14 pt"] */
  parts: string[]
  /** Hex color to show as a swatch, if the style sets one */
  color?: string
  /** Set for br / p, which cannot be restyled */
  builtin?: string
}

/** Describes what a tag will do, for tables and lists. Returns null if the tag has no rule. */
export function describeStyle(tag: string, rules: Record<string, TagStyle>): StyleDescription | null {
  if (tag in BUILTIN_TAGS) return { parts: [BUILTIN_TAGS[tag]], builtin: BUILTIN_TAGS[tag] }
  const rule = rules[tag]
  if (!rule) return null
  const parts: string[] = []
  if (rule.bold) parts.push('Bold')
  if (rule.italic) parts.push('Italic')
  if (rule.underline) parts.push('Underline')
  if (rule.strike) parts.push('Strikethrough')
  if (rule.vertAlign) parts.push(rule.vertAlign === 'superscript' ? 'Superscript' : 'Subscript')
  if (rule.size) parts.push(`${rule.size} pt`)
  if (rule.font) parts.push(rule.font)
  if (rule.color) parts.push(rule.color.toUpperCase())
  return { parts: parts.length ? parts : ['No changes'], color: rule.color }
}
