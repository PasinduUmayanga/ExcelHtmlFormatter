// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ActivityEntry, ElectronApi } from '@hf/core'
import { useApp } from '../src/store'
import { FeatureCard } from '../src/design/molecules'
import { describeActivity, formatWhen } from '../src/design/organisms'
import { EXPORT_TARGETS } from '../src/screens/Dashboard'

const cells = { singular: 'cell', plural: 'cells' }
const saved = (patch: Partial<ActivityEntry> = {}): ActivityEntry => ({
  kind: 'saved',
  fileName: 'out.xlsx',
  folder: 'C:\\out',
  at: '2026-11-09T10:00:00.000Z',
  sourceName: 'in.xlsx',
  converted: 41,
  check: 'verified',
  differences: 0,
  ...patch
})

describe('describeActivity', () => {
  it('says what happened and how the saved file checked out', () => {
    expect(describeActivity({ ...saved(), kind: 'opened' }, cells)).toBe('Opened')
    expect(describeActivity(saved(), cells)).toBe('Saved from in.xlsx · 41 cells formatted · saved file verified')
    expect(describeActivity(saved({ check: 'differences', differences: 2, converted: 1 }), cells)).toBe(
      'Saved from in.xlsx · 1 cell formatted · 2 differences in the saved file'
    )
    expect(describeActivity(saved({ check: 'not-checked', sourceName: undefined, converted: undefined }), cells)).toBe(
      'Saved · saved file not checked'
    )
  })
})

describe('formatWhen', () => {
  const now = new Date(2026, 10, 9, 15, 0)
  it('uses Today and Yesterday, then the date', () => {
    expect(formatWhen(new Date(2026, 10, 9, 9, 5).toISOString(), now)).toBe('Today, 09:05')
    expect(formatWhen(new Date(2026, 10, 8, 23, 59).toISOString(), now)).toBe('Yesterday, 23:59')
    expect(formatWhen(new Date(2026, 10, 7, 16, 45).toISOString(), now)).toBe('7 Nov 2026, 16:45')
  })
})

describe('FeatureCard', () => {
  it('is a labelled section with its action, primary or unavailable', () => {
    const html = renderToStaticMarkup(
      <FeatureCard title="Convert to PDF" description="Later" unavailable action={<button disabled>No</button>} />
    )
    expect(html).toMatch(
      /^<section class="feature unavailable" aria-labelledby="([^"]+)"><div class="feature-head"><h3 id="\1">Convert to PDF<\/h3>/
    )
    expect(html).toContain('<button disabled="">No</button>')
    expect(renderToStaticMarkup(<FeatureCard primary title="Open" description="x" />)).toContain(
      'class="feature primary"'
    )
  })

  it('lists the coming conversions as not available yet', () => {
    expect(EXPORT_TARGETS.map((t) => [t.id, t.available])).toEqual([
      ['pdf', false],
      ['word', false],
      ['txt', false]
    ])
  })
})

describe('recent activity and Continue (store)', () => {
  let api: Partial<Record<keyof ElectronApi, ReturnType<typeof vi.fn>>>
  beforeEach(() => {
    api = {
      getActivity: vi.fn(async () => [saved()]),
      clearActivity: vi.fn(async () => {}),
      openFileDialog: vi.fn(async () => null)
    }
    ;(window as unknown as { api: typeof api }).api = api
    useApp.setState({ activity: [], doc: null, lastStep: null, error: null, notice: null })
  })

  it('loads and clears the list', async () => {
    await useApp.getState().loadActivity()
    expect(useApp.getState().activity).toEqual([saved()])
    await useApp.getState().clearActivity()
    expect(useApp.getState().activity).toEqual([])
    expect(useApp.getState().notice).toBe('Recent activity cleared')
  })

  it('keeps the list when it cannot be read, and reports a failed clear', async () => {
    useApp.setState({ activity: [saved()] })
    api.getActivity!.mockRejectedValueOnce(new Error('disk'))
    await useApp.getState().loadActivity()
    expect(useApp.getState().activity).toHaveLength(1)
    api.clearActivity!.mockRejectedValueOnce(new Error('Error: read-only'))
    await useApp.getState().clearActivity()
    expect(useApp.getState().error).toBe('Could not clear recent activity. read-only')
  })

  it('opens the dialog in a recent folder', async () => {
    await useApp.getState().browseForFile('C:\\out')
    expect(api.openFileDialog).toHaveBeenCalledWith('C:\\out')
  })

  it('remembers the last document screen only while a file is open', () => {
    useApp.getState().rememberStep('/preview/Sheet1')
    expect(useApp.getState().lastStep).toBeNull()
    useApp.setState({ doc: { file: { path: 'x', name: 'x', sizeBytes: 1 }, sections: [] } })
    useApp.getState().rememberStep('/preview/Sheet1')
    expect(useApp.getState().lastStep).toBe('/preview/Sheet1')
  })
})
