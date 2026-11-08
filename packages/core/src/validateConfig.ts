import { BUILTIN_TAGS, defaultConfig } from './defaultRules'
import type { AppConfig, TagStyle, UnknownTagAction } from './types'

export const TAG_NAME_RE = /^[a-z][a-z0-9-]*$/
/** Excel limits: font names up to 31 characters, sizes 1–409 pt. */
const MAX_FONT_NAME = 31
const MAX_FONT_SIZE = 409

/** Normalises a tag name typed by the user ("<Mark>" -> "mark"). Returns null if it is not a valid tag name. */
export function normalizeTagName(input: string): string | null {
  const name = input
    .trim()
    .replace(/^<\/?|\/?>$/g, '')
    .trim()
    .toLowerCase()
  return TAG_NAME_RE.test(name) ? name : null
}

/** "#c00" / "C00000" -> "#C00000". Returns undefined if it is not a hex color. */
export function normalizeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  let hex = value.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(hex))
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('')
  return /^[0-9a-fA-F]{6}$/.test(hex) ? '#' + hex.toUpperCase() : undefined
}

/** Keeps only the style options the app understands, with valid values. */
export function sanitizeStyle(input: unknown): TagStyle {
  const style: TagStyle = {}
  if (!input || typeof input !== 'object') return style
  const raw = input as Record<string, unknown>
  for (const key of ['bold', 'italic', 'underline', 'strike'] as const) {
    if (raw[key] === true) style[key] = true
  }
  const color = normalizeColor(raw.color)
  if (color) style.color = color
  if (typeof raw.size === 'number' && Number.isFinite(raw.size) && raw.size >= 1 && raw.size <= MAX_FONT_SIZE) {
    style.size = Math.round(raw.size * 2) / 2 // Excel uses half-point steps
  }
  if (typeof raw.font === 'string' && raw.font.trim() && raw.font.trim().length <= MAX_FONT_NAME) {
    style.font = raw.font.trim()
  }
  if (raw.vertAlign === 'superscript' || raw.vertAlign === 'subscript') style.vertAlign = raw.vertAlign
  return style
}

/**
 * Checks a config read from disk or imported by the user.
 * Throws if it is not a tag-style config at all; otherwise drops anything invalid.
 */
export function validateConfig(input: unknown): AppConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('This file does not contain tag styles.')
  }
  const raw = input as Record<string, unknown>
  if (!raw.rules || typeof raw.rules !== 'object' || Array.isArray(raw.rules)) {
    throw new Error('This file does not contain tag styles.')
  }
  const base = defaultConfig()
  const rules: Record<string, TagStyle> = {}
  for (const [name, style] of Object.entries(raw.rules as Record<string, unknown>)) {
    const tag = normalizeTagName(name)
    if (tag && !(tag in BUILTIN_TAGS)) rules[tag] = sanitizeStyle(style)
  }
  const action: UnknownTagAction = raw.unknownTagAction === 'keep' ? 'keep' : 'strip'
  const profileName =
    typeof raw.profileName === 'string' && raw.profileName.trim()
      ? raw.profileName.trim().slice(0, 60)
      : base.profileName
  return { profileName, unknownTagAction: action, rules }
}
