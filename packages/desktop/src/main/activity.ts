import type { ActivityEntry } from '@hf/core'

/** How many recent actions are kept (newest first). */
export const MAX_ACTIVITY = 10

const MAX_NAME = 260
const MAX_FOLDER = 4096
const CHECKS = ['verified', 'differences', 'not-checked'] as const

const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max && !value.includes('\0')
const count = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0

/**
 * Reads the stored activity list, keeping only well-formed entries (the file may be old, edited by hand or
 * damaged). Never throws.
 */
export function parseActivity(data: unknown): ActivityEntry[] {
  if (!Array.isArray(data)) return []
  const list: ActivityEntry[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object') continue
    const e = item as Record<string, unknown>
    if ((e.kind !== 'opened' && e.kind !== 'saved') || !text(e.fileName, MAX_NAME) || !text(e.folder, MAX_FOLDER)) {
      continue
    }
    if (typeof e.at !== 'string' || Number.isNaN(Date.parse(e.at))) continue
    const entry: ActivityEntry = { kind: e.kind, fileName: e.fileName, folder: e.folder, at: e.at }
    if (e.kind === 'saved') {
      if (text(e.sourceName, MAX_NAME)) entry.sourceName = e.sourceName
      if (count(e.converted)) entry.converted = e.converted
      if (CHECKS.includes(e.check as (typeof CHECKS)[number])) entry.check = e.check as ActivityEntry['check']
      if (count(e.differences)) entry.differences = e.differences
    }
    list.push(entry)
    if (list.length === MAX_ACTIVITY) break
  }
  return list
}

/** The list with a new action at the top, limited to MAX_ACTIVITY. */
export function addActivity(list: readonly ActivityEntry[], entry: ActivityEntry): ActivityEntry[] {
  return [entry, ...list].slice(0, MAX_ACTIVITY)
}

/**
 * The folder to start the Open dialog in: only a folder from the activity list (or the favourites), so the window
 * can't point the dialog anywhere else. Anything else gives undefined (the dialog's usual folder).
 */
export function knownFolder(list: readonly { folder: string }[], folder: unknown): string | undefined {
  return typeof folder === 'string' && list.some((e) => e.folder === folder) ? folder : undefined
}
