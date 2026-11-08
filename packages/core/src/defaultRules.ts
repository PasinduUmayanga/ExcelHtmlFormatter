import type { AppConfig, TagStyle } from './types'

/** Tags that are always handled the same way and cannot be restyled. */
export const BUILTIN_TAGS: Record<string, string> = {
  br: 'Line break',
  p: 'Paragraph break'
}

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

export function defaultConfig(): AppConfig {
  return {
    profileName: 'Default',
    unknownTagAction: 'strip',
    rules: structuredClone(DEFAULT_RULES)
  }
}
