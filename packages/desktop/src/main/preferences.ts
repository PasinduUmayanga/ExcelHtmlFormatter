import type { Preferences, ThemeChoice } from '@hf/core'

const THEMES: readonly ThemeChoice[] = ['system', 'light', 'dark']

export const isTheme = (value: unknown): value is ThemeChoice => THEMES.includes(value as ThemeChoice)

/** Reads stored preferences; anything missing or invalid falls back to the default (follow the system). */
export function parsePreferences(data: unknown): Preferences {
  const theme = data && typeof data === 'object' ? (data as Record<string, unknown>).theme : undefined
  return { theme: isTheme(theme) ? theme : 'system' }
}

/**
 * The window's background before the page paints: the same colour as the sidebar in that theme, so a dark
 * window never flashes white while it loads. Keep in line with `--side` in @hf/ui's tokens.css.
 */
export const windowBackground = (dark: boolean): string => (dark ? '#0b172a' : '#edf3fb')
