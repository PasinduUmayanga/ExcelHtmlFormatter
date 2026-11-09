import { BUILTIN_TAGS, builtinStyle, isBuiltin } from './defaultRules'
import type { TagStyle } from './types'

/** True if the tag has a rule, or the app handles it without one (structure or a built-in default look). */
export function isConfigured(tag: string, rules: Record<string, TagStyle>): boolean {
  return isBuiltin(tag) || Object.hasOwn(rules, tag)
}

export interface StyleDescription {
  /** Readable parts, e.g. ["Bold", "Italic", "14 pt"] */
  parts: string[]
  /** Hex color to show as a swatch, if the style sets one */
  color?: string
  /** Set for structural tags (br, p, lists, tables, hr), which cannot be restyled */
  builtin?: string
  /** True when no rule exists and the built-in default look is used (it can still be changed) */
  fallback?: boolean
}

/** Describes what a tag will do, for tables and lists. Returns null if the tag has no rule. */
export function describeStyle(tag: string, rules: Record<string, TagStyle>): StyleDescription | null {
  if (Object.hasOwn(BUILTIN_TAGS, tag)) return { parts: [BUILTIN_TAGS[tag]], builtin: BUILTIN_TAGS[tag] }
  const own = Object.hasOwn(rules, tag) ? rules[tag] : undefined
  const rule = own ?? builtinStyle(tag)
  if (!rule) return null
  const described = describeRule(rule)
  return own ? described : { ...described, fallback: true }
}

function describeRule(rule: TagStyle): StyleDescription {
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
