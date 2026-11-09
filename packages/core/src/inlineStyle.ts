import { normalizeColor } from './validateConfig'
import type { TagStyle } from './types'

/**
 * A style read from an inline `style="…"` attribute. Unlike settings rules, it can switch things
 * **off** (`font-weight: normal` inside `<b>` → `bold: false`), and it can mark text as highlighted
 * (`background-color`).
 */
export interface InlineStyle extends TagStyle {
  highlight?: boolean
}

const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#FFFFFF',
  red: '#FF0000',
  green: '#008000',
  blue: '#0000FF',
  yellow: '#FFFF00',
  orange: '#FFA500',
  purple: '#800080',
  gray: '#808080',
  grey: '#808080',
  silver: '#C0C0C0',
  maroon: '#800000',
  navy: '#000080',
  teal: '#008080',
  olive: '#808000',
  lime: '#00FF00',
  aqua: '#00FFFF',
  cyan: '#00FFFF',
  fuchsia: '#FF00FF',
  magenta: '#FF00FF',
  brown: '#A52A2A',
  pink: '#FFC0CB',
  darkred: '#8B0000',
  darkgreen: '#006400',
  darkblue: '#00008B'
}

const GENERIC_FONTS = new Set(['serif', 'sans-serif', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif'])
const DEFAULT_SIZE_PT = 11 // what "1em" means: Excel's default font size

/** "#c00", "rgb(204,0,0)", "red" → "#CC0000". Returns undefined for anything else (incl. transparent). */
export function parseCssColor(value: string): string | undefined {
  const v = value.trim().toLowerCase()
  if (v in NAMED_COLORS) return NAMED_COLORS[v]
  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+%?)\s*)?\)$/.exec(v)
  if (rgb) {
    if (rgb[4] !== undefined && parseFloat(rgb[4]) === 0) return undefined // fully transparent
    const hex = rgb
      .slice(1, 4)
      .map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0'))
      .join('')
    return normalizeColor(hex)
  }
  return normalizeColor(v)
}

/** "12pt" → 12, "16px" → 12, "1.5em" → 16.5. Excel's limits (1–409 pt), half-point steps. */
export function parseCssFontSize(value: string): number | undefined {
  const m = /^(\d+(?:\.\d+)?)(pt|px|em|rem|%)$/.exec(value.trim().toLowerCase())
  if (!m) return undefined
  const n = Number(m[1])
  const pt =
    m[2] === 'pt' ? n : m[2] === 'px' ? n * 0.75 : m[2] === '%' ? (n / 100) * DEFAULT_SIZE_PT : n * DEFAULT_SIZE_PT
  if (pt < 1 || pt > 409) return undefined
  return Math.round(pt * 2) / 2
}

/** First usable font of a CSS font-family list. `monospace` → Consolas; other generic names are ignored. */
export function parseCssFontFamily(value: string): string | undefined {
  const first = value
    .split(',')[0]
    ?.trim()
    .replace(/^["']|["']$/g, '')
    .trim()
  if (!first) return undefined
  if (first.toLowerCase() === 'monospace') return 'Consolas'
  if (GENERIC_FONTS.has(first.toLowerCase())) return undefined
  return first.length <= 31 ? first : undefined
}

/**
 * Reads the supported subset of an inline `style` attribute:
 * color, background(-color), font-weight, font-style, text-decoration(-line), font-size, font-family,
 * vertical-align. Everything else (and anything invalid) is ignored, never an error.
 */
export function parseInlineStyle(css: string): InlineStyle {
  const style: InlineStyle = {}
  for (const declaration of css.split(';')) {
    const colon = declaration.indexOf(':')
    if (colon === -1) continue
    const prop = declaration.slice(0, colon).trim().toLowerCase()
    const value = declaration
      .slice(colon + 1)
      .replace(/!important\s*$/i, '')
      .trim()
    const lower = value.toLowerCase()
    switch (prop) {
      case 'color': {
        const c = parseCssColor(value)
        if (c) style.color = c
        break
      }
      case 'background':
      case 'background-color': {
        const c = parseCssColor(value.split(/\s+/)[0] ?? '')
        if (c) style.highlight = c !== '#FFFFFF'
        break
      }
      case 'font-weight':
        if (lower === 'bold' || lower === 'bolder') style.bold = true
        else if (lower === 'normal' || lower === 'lighter') style.bold = false
        else if (/^\d{3}$/.test(lower)) style.bold = Number(lower) >= 600
        break
      case 'font-style':
        if (lower === 'italic' || lower.startsWith('oblique')) style.italic = true
        else if (lower === 'normal') style.italic = false
        break
      case 'text-decoration':
      case 'text-decoration-line':
        if (lower === 'none') {
          style.underline = false
          style.strike = false
        } else {
          if (/\bunderline\b/.test(lower)) style.underline = true
          if (/\bline-through\b/.test(lower)) style.strike = true
        }
        break
      case 'font-size': {
        const size = parseCssFontSize(value)
        if (size) style.size = size
        break
      }
      case 'font-family': {
        const font = parseCssFontFamily(value)
        if (font) style.font = font
        break
      }
      case 'vertical-align':
        if (lower === 'super' || lower === 'sup') style.vertAlign = 'superscript'
        else if (lower === 'sub') style.vertAlign = 'subscript'
        break
    }
  }
  return style
}
