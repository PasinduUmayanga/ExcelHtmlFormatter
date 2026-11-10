import type { ActivityEntry, FavoriteFile } from '@hf/core'

/** How many favourites are kept. */
export const MAX_FAVORITES = 50

const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max && !value.includes('\0')

/** Reads the stored favourites, keeping only well-formed entries (the file may be edited or damaged). Never throws. */
export function parseFavorites(data: unknown): FavoriteFile[] {
  if (!Array.isArray(data)) return []
  const list: FavoriteFile[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object') continue
    const e = item as Record<string, unknown>
    if (!text(e.fileName, 260) || !text(e.folder, 4096)) continue
    if (typeof e.at !== 'string' || Number.isNaN(Date.parse(e.at))) continue
    if (list.some((f) => f.fileName === e.fileName && f.folder === e.folder)) continue
    list.push({ fileName: e.fileName, folder: e.folder, at: e.at })
    if (list.length === MAX_FAVORITES) break
  }
  return list
}

/**
 * Stars or unstars a file (ADR 0017). Unstarring always works; starring only a file that is in the recent activity,
 * so the window can't store a path the user never opened or saved. Anything else leaves the list as it was.
 */
export function toggleFavorite(
  list: readonly FavoriteFile[],
  activity: readonly ActivityEntry[],
  fileName: unknown,
  folder: unknown,
  now: string
): FavoriteFile[] {
  if (typeof fileName !== 'string' || typeof folder !== 'string') return [...list]
  const same = (f: { fileName: string; folder: string }) => f.fileName === fileName && f.folder === folder
  if (list.some(same)) return list.filter((f) => !same(f))
  if (!activity.some(same)) return [...list]
  return [{ fileName, folder, at: now }, ...list].slice(0, MAX_FAVORITES)
}
