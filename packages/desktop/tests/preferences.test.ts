import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isTheme, parsePreferences, windowBackground } from '../src/main/preferences'

describe('preferences', () => {
  it('reads the saved theme, falling back to System for anything else', () => {
    expect(parsePreferences({ theme: 'dark' })).toEqual({ theme: 'dark' })
    expect(parsePreferences({ theme: 'light', other: 1 })).toEqual({ theme: 'light' })
    for (const bad of [null, 'dark', [], {}, { theme: 'blue' }, { theme: 1 }]) {
      expect(parsePreferences(bad)).toEqual({ theme: 'system' })
    }
  })

  it('accepts only the three theme choices', () => {
    expect(['system', 'light', 'dark'].every(isTheme)).toBe(true)
    expect([undefined, 'Dark', 'auto', 0].some(isTheme)).toBe(false)
  })

  it("paints the window in the theme's sidebar colour before the page loads", () => {
    // Must match --side in the window's tokens, or the first paint would flash a different colour.
    const tokens = readFileSync(join(__dirname, '../../ui/src/design/tokens.css'), 'utf8')
    const sides = [...tokens.matchAll(/--side:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1].toLowerCase())
    expect(sides[0]).toBe(windowBackground(false))
    expect(new Set(sides.slice(1))).toEqual(new Set([windowBackground(true)]))
  })
})
