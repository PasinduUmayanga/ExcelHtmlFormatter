/**
 * The window's icons. They are characters, so they inherit the text colour and size, and screen readers
 * read them as part of the text (as before; hiding them is a separate, approved-later change).
 */
export const ICONS = {
  warning: '⚠',
  info: 'ℹ',
  check: '✓',
  close: '✕',
  file: '📄',
  save: '💾',
  settings: '⚙'
} as const

export type IconName = keyof typeof ICONS

export function Icon({ name }: { name: IconName }) {
  return ICONS[name]
}
