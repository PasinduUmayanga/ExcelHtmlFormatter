import { describe, expect, it } from 'vitest'
import type { ActivityEntry } from '@hf/core'
import { addActivity, knownFolder, MAX_ACTIVITY, parseActivity } from '../src/main/activity'

const opened = (n: number, folder = 'C:\\data'): ActivityEntry => ({
  kind: 'opened',
  fileName: `file${n}.xlsx`,
  folder,
  at: `2026-11-09T10:${String(n).padStart(2, '0')}:00.000Z`
})

describe('activity list', () => {
  it('keeps the newest actions first, at most ten', () => {
    let list: ActivityEntry[] = []
    for (let i = 0; i < 12; i++) list = addActivity(list, opened(i))
    expect(list).toHaveLength(MAX_ACTIVITY)
    expect(list[0].fileName).toBe('file11.xlsx')
    expect(list.at(-1)!.fileName).toBe('file2.xlsx')
  })

  it('reads a stored list, dropping anything malformed', () => {
    const saved = {
      kind: 'saved',
      fileName: 'out.xlsx',
      folder: 'C:\\out',
      at: '2026-11-09T11:00:00.000Z',
      sourceName: 'in.xlsx',
      converted: 41,
      check: 'verified',
      differences: 0,
      extra: 'ignored'
    }
    const list = parseActivity([
      saved,
      opened(1),
      null,
      'text',
      { ...opened(2), kind: 'deleted' },
      { ...opened(3), fileName: '' },
      { ...opened(4), folder: 'a\0b' },
      { ...opened(5), at: 'yesterday' },
      { ...saved, check: 'perfect', converted: -1, differences: 1.5, sourceName: 7 }
    ])
    expect(list).toEqual([
      {
        kind: 'saved',
        fileName: 'out.xlsx',
        folder: 'C:\\out',
        at: '2026-11-09T11:00:00.000Z',
        sourceName: 'in.xlsx',
        converted: 41,
        check: 'verified',
        differences: 0
      },
      opened(1),
      { kind: 'saved', fileName: 'out.xlsx', folder: 'C:\\out', at: '2026-11-09T11:00:00.000Z' }
    ])
    expect(parseActivity({ not: 'a list' })).toEqual([])
    expect(parseActivity(Array.from({ length: 20 }, (_, i) => opened(i)))).toHaveLength(MAX_ACTIVITY)
  })

  it('starts the Open dialog only in folders from the list', () => {
    const list = [opened(1, 'C:\\reports')]
    expect(knownFolder(list, 'C:\\reports')).toBe('C:\\reports')
    expect(knownFolder(list, 'C:\\Windows')).toBeUndefined()
    expect(knownFolder(list, undefined)).toBeUndefined()
    expect(knownFolder(list, 42)).toBeUndefined()
  })
})
