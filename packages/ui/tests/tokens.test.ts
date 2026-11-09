import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { GLYPH_KINDS } from '../src/design/atoms/FileGlyph'

/** WCAG 2.2 contrast ratio of two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// The light values come from the first :root block; dark values override them.
const css = readFileSync(join(__dirname, '../src/styles/tokens.css'), 'utf8')
const darkStart = css.indexOf('@media (prefers-color-scheme: dark)')
const read = (text: string) =>
  Object.fromEntries([...text.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1], m[2].toLowerCase()]))
const light = read(css.slice(0, darkStart))
const themes = { light, dark: { ...light, ...read(css.slice(darkStart)) } }

/** [foreground, background] pairs used for text: at least 4.5:1. */
const TEXT: [string, string][] = [
  ['text', 'bg'],
  ['text', 'side'],
  ['muted', 'bg'],
  ['muted', 'side'],
  ['muted', 'line'], // muted chips
  ['muted', 'accent-bg'], // descriptions on the primary Home card
  ['faint', 'bg'],
  ['faint', 'side'],
  ['accent', 'bg'], // links and link buttons
  ['accent-text', 'accent-bg'],
  ['ok', 'bg'],
  ['ok', 'ok-bg'],
  ['warn', 'bg'],
  ['warn', 'warn-bg'],
  ['bad', 'bg'],
  ['bad', 'bad-bg'],
  ['on-accent', 'accent-fill'], // primary buttons, pressed toggles, the current page in the sidebar
  ['on-accent', 'accent-fill-hover'],
  ['on-accent', 'accent-fill-end'], // the dark end of the primary button gradient
  ['on-ok', 'ok'], // completed steps
  // Cards, inputs and raised panels (the redesign's --surface levels)
  ['text', 'surface'],
  ['text', 'surface-raised'],
  ['text', 'surface-hover'],
  ['muted', 'surface'],
  ['muted', 'surface-raised'],
  ['faint', 'surface'],
  ['faint', 'surface-raised'],
  ['accent', 'surface'],
  ['ok', 'surface'],
  ['warn', 'surface'],
  ['bad', 'surface']
]
/** Boundaries of controls and the focus ring: at least 3:1. */
const NON_TEXT: [string, string][] = [
  ['control-border', 'bg'],
  ['control-border', 'side'],
  ['accent', 'bg'],
  ['accent', 'side'],
  ['control-border', 'surface'],
  ['accent', 'surface'],
  ['focus', 'bg'],
  ['focus', 'surface']
]

describe('colour contrast (WCAG 2.2 AA)', () => {
  for (const [theme, tokens] of Object.entries(themes)) {
    it(`${theme}: text is at least 4.5:1 and control borders at least 3:1`, () => {
      const failures: string[] = []
      for (const [pairs, minimum] of [
        [TEXT, 4.5],
        [NON_TEXT, 3]
      ] as const) {
        for (const [fg, bg] of pairs) {
          expect(tokens[fg], `--${fg} in ${theme}`).toMatch(/^#/)
          expect(tokens[bg], `--${bg} in ${theme}`).toMatch(/^#/)
          const ratio = contrast(tokens[fg], tokens[bg])
          if (ratio < minimum) failures.push(`--${fg} on --${bg}: ${ratio.toFixed(2)} (needs ${minimum})`)
        }
      }
      expect(failures).toEqual([])
    })
  }

  it('measures contrast correctly', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrast('#ffffff', '#ffffff')).toBe(1)
  })
})

describe('file type pictures', () => {
  // The white labels can be small (recent activity), so they need the full 4.5:1, not the 3:1 for large text.
  it.each(Object.entries(GLYPH_KINDS))('white on the %s label is at least 4.5:1', (_kind, { to }) => {
    expect(contrast('#ffffff', to)).toBeGreaterThanOrEqual(4.5)
  })
})
