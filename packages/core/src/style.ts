import type { TagStyle } from './types'

/** Every TagStyle option. Comparing over this fixed list avoids building objects (runs are compared constantly). */
const STYLE_KEYS: readonly (keyof TagStyle)[] = [
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'size',
  'font',
  'vertAlign'
]

/** An empty or switched-off value: the same as not setting the option at all. */
const isEmpty = (value: unknown) => value === undefined || value === null || value === false || value === ''

/** Removes empty/false values so styles can be compared. */
export function cleanStyle(style: TagStyle): TagStyle {
  const out: TagStyle = {}
  for (const [key, value] of Object.entries(style) as [keyof TagStyle, unknown][]) {
    if (!isEmpty(value)) (out as Record<string, unknown>)[key] = value
  }
  return out
}

export function sameStyle(a: TagStyle, b: TagStyle): boolean {
  if (a === b) return true
  for (const key of STYLE_KEYS) {
    const x = a[key]
    const y = b[key]
    if (x !== y && !(isEmpty(x) && isEmpty(y))) return false
  }
  // Options outside the known list (from an older or newer settings file) still count.
  return sameExtras(a, b) && sameExtras(b, a)
}

function sameExtras(a: TagStyle, b: TagStyle): boolean {
  for (const key in a) {
    if (STYLE_KEYS.includes(key as keyof TagStyle)) continue
    const x = (a as Record<string, unknown>)[key]
    const y = (b as Record<string, unknown>)[key]
    if (x !== y && !(isEmpty(x) && isEmpty(y))) return false
  }
  return true
}
