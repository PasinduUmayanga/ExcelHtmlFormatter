import { describe, expect, it } from 'vitest'
import type { ActivityEntry } from '@hf/core'
import { MAX_FAVORITES, parseFavorites, toggleFavorite } from '../src/main/favorites'
import { knownFolder } from '../src/main/activity'

const at = '2026-11-10T10:00:00.000Z'
const activity: ActivityEntry[] = [{ kind: 'saved', fileName: 'a.xlsx', folder: 'C:/docs', at }]

describe('favourites (main process)', () => {
  it('keeps only well-formed, unique entries from the stored file', () => {
    expect(parseFavorites('nope')).toEqual([])
    const good = { fileName: 'a.xlsx', folder: 'C:/docs', at }
    expect(
      parseFavorites([good, good, { fileName: '', folder: 'x', at }, { fileName: 'b', folder: 'x', at: 'never' }, null])
    ).toEqual([good])
    const many = Array.from({ length: MAX_FAVORITES + 5 }, (_, i) => ({ fileName: `${i}.xlsx`, folder: 'C:/', at }))
    expect(parseFavorites(many)).toHaveLength(MAX_FAVORITES)
  })

  it('stars only files from the recent activity, and unstars any starred file', () => {
    const starred = toggleFavorite([], activity, 'a.xlsx', 'C:/docs', at)
    expect(starred).toEqual([{ fileName: 'a.xlsx', folder: 'C:/docs', at }])
    // Not in the activity: refused, nothing stored
    expect(toggleFavorite([], activity, 'secret.xlsx', 'C:/Windows', at)).toEqual([])
    expect(toggleFavorite([], activity, 42, null, at)).toEqual([])
    // Unstarring works even after the activity was cleared
    expect(toggleFavorite(starred, [], 'a.xlsx', 'C:/docs', at)).toEqual([])
  })

  it('lets the Open dialog start in a favourite folder', () => {
    const favorites = toggleFavorite([], activity, 'a.xlsx', 'C:/docs', at)
    expect(knownFolder(favorites, 'C:/docs')).toBe('C:/docs')
    expect(knownFolder(favorites, 'C:/elsewhere')).toBeUndefined()
  })
})
