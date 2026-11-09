import type { AppConfig, TagStyle } from './types'

/**
 * Tags with fixed structure that can't be restyled (their label is shown in the UI).
 * Settings can't hold rules for these (see validateConfig).
 */
export const BUILTIN_TAGS: Record<string, string> = {
  br: 'Line break',
  p: 'Paragraph break',
  ul: 'Bulleted list',
  ol: 'Numbered list',
  li: 'List item',
  table: 'Table',
  thead: 'Table section',
  tbody: 'Table section',
  tfoot: 'Table section',
  tr: 'Table row',
  td: 'Table cell',
  caption: 'Table caption',
  hr: 'Horizontal line'
}

/**
 * Tags with built-in behaviour or a default look that the user **can** restyle. When the settings have
 * no rule for one of these, this style is used, so these tags never count as "unknown".
 * (Structure such as heading lines, links and highlight is applied regardless of the style.)
 */
export const BUILTIN_STYLES: Record<string, TagStyle> = {
  h1: { bold: true, size: 18 },
  h2: { bold: true, size: 16 },
  h3: { bold: true, size: 14 },
  h4: { bold: true, size: 13 },
  h5: { bold: true, size: 12 },
  h6: { bold: true, size: 11 },
  a: { color: '#0563C1', underline: true },
  mark: { bold: true, color: '#B45309' },
  code: { font: 'Consolas' },
  pre: { font: 'Consolas' },
  blockquote: { italic: true },
  th: { bold: true },
  del: { strike: true },
  span: {}
}

/** True if a tag is handled without a settings rule (fixed structure or a built-in default look). */
export const isBuiltin = (tag: string) => Object.hasOwn(BUILTIN_TAGS, tag) || Object.hasOwn(BUILTIN_STYLES, tag)

/** The built-in default look of a tag, or undefined (safe for names like "constructor") */
export const builtinStyle = (tag: string) => (Object.hasOwn(BUILTIN_STYLES, tag) ? BUILTIN_STYLES[tag] : undefined)

export const DEFAULT_RULES: Record<string, TagStyle> = {
  b: { bold: true },
  strong: { bold: true },
  i: { italic: true },
  em: { italic: true },
  u: { underline: true },
  s: { strike: true },
  sup: { vertAlign: 'superscript' },
  sub: { vertAlign: 'subscript' }
}

/** Version of the settings format. 2 (F2): the built-in looks became rules the user can see and change. */
export const SETTINGS_VERSION = 2

/**
 * The built-in looks as settings rules, so they show up (and can be changed) in Tag styles.
 * <span> is left out: on its own it changes nothing, so a rule for it would only be noise.
 */
export function builtinRules(): Record<string, TagStyle> {
  const rules: Record<string, TagStyle> = {}
  for (const [tag, style] of Object.entries(BUILTIN_STYLES)) if (Object.keys(style).length) rules[tag] = { ...style }
  return rules
}

export function defaultConfig(): AppConfig {
  return {
    version: SETTINGS_VERSION,
    profileName: 'Default',
    unknownTagAction: 'strip',
    rules: { ...structuredClone(DEFAULT_RULES), ...builtinRules() }
  }
}
