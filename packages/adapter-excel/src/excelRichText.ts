import type { Run, TagStyle } from '@hf/core'

/** The subset of ExcelJS's Font that we write. Kept local so this file needs no ExcelJS types. */
export interface ExcelFont {
  name?: string
  size?: number
  /** Font family number and theme scheme, copied from the cell's own font. */
  family?: number
  scheme?: 'minor' | 'major' | 'none'
  charset?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean | 'single' | 'double' | 'singleAccounting' | 'doubleAccounting'
  strike?: boolean
  /** argb ("FFC00000") or a theme color index with optional tint */
  color?: { argb?: string; theme?: number; tint?: number }
  vertAlign?: 'superscript' | 'subscript'
}

export interface ExcelRichText {
  richText: { text: string; font?: ExcelFont }[]
}

/** "#c00000" or "#c00" -> "FFC00000". Returns undefined for anything that is not a hex color. */
export function hexToArgb(hex: string): string | undefined {
  let h = hex.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('')
  return /^[0-9a-fA-F]{6}$/.test(h) ? 'FF' + h.toUpperCase() : undefined
}

/**
 * Builds the font for one run. `base` is the cell's own font (name, size, color …):
 * a run keeps it unless the tag's style overrides that property.
 */
export function toExcelFont(style: TagStyle, base: ExcelFont = {}): ExcelFont {
  const font: ExcelFont = { ...base }
  if (style.bold) font.bold = true
  if (style.italic) font.italic = true
  if (style.underline) font.underline = true
  if (style.strike) font.strike = true
  if (style.size) font.size = style.size
  if (style.font) {
    font.name = style.font
    // A theme scheme ("minor"/"major") would make Excel ignore the font name and use the theme font.
    delete font.scheme
    delete font.family
    delete font.charset
  }
  if (style.vertAlign) font.vertAlign = style.vertAlign
  if (style.color) {
    const argb = hexToArgb(style.color)
    if (argb) font.color = { argb }
  }
  return font
}

/** Converts runs into the value ExcelJS expects for a rich-text cell. */
export function toExcelRichText(runs: Run[], base?: ExcelFont): ExcelRichText {
  return {
    richText: runs.map((run) => {
      const font = toExcelFont(run.style, base)
      return Object.keys(font).length ? { text: run.text, font } : { text: run.text }
    })
  }
}
