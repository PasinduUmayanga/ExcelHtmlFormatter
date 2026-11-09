// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CANCELLED_MESSAGE,
  defaultConfig,
  emptyReport,
  type ContentReport,
  type DocumentSummary,
  type ElectronApi,
  type ExportResult
} from '@hf/core'
import { useApp } from '../src/store'

const doc: DocumentSummary = {
  file: { path: 'C:/x.xlsx', name: 'x.xlsx', sizeBytes: 1 },
  sections: [{ name: 'Sheet', state: 'visible', sizeLabel: '1 × 1', scan: { htmlCells: 1, tags: {} } }]
}
const clean: ContentReport = { ...emptyReport(), checked: 2, complete: 2 }
const withIssue: ContentReport = {
  ...emptyReport(),
  checked: 2,
  complete: 1,
  issues: 1,
  items: [{ section: 'Sheet', location: 'A1', severity: 'issue', kind: 'limit', source: '<b>x</b>', converted: 'x' }]
}
const saved: ExportResult = {
  path: 'C:/y.xlsx',
  fileName: 'y.xlsx',
  stats: {
    sections: [{ name: 'Sheet', converted: 2 }],
    converted: 2,
    withLineBreaks: 0,
    unknownTags: [],
    linksAdded: 0,
    linksSkipped: 0,
    highlighted: 0,
    check: clean
  },
  verification: { compared: 2, differences: 0, items: [], truncated: false }
}

let api: Record<keyof ElectronApi, ReturnType<typeof vi.fn>>
beforeEach(() => {
  api = {
    checkDocument: vi.fn(async () => clean),
    exportDocument: vi.fn(async () => saved),
    exportReport: vi.fn(async () => 'report.csv'),
    onJobProgress: vi.fn(() => () => {}),
    loadConfig: vi.fn(async () => defaultConfig()),
    getAppInfo: vi.fn(async () => ({ version: '1', platform: 'win32', configPath: 'c' })),
    saveConfig: vi.fn(async () => {})
  } as unknown as typeof api
  ;(window as unknown as { api: typeof api }).api = api
  useApp.setState({ doc, selected: ['Sheet'], config: defaultConfig(), exportResult: null, error: null })
})
afterEach(() => {
  useApp.setState({
    doc: null,
    selected: [],
    check: { status: 'idle', report: null, progress: null, error: null, key: null }
  })
})

describe('content check (store)', () => {
  it('runs once per file, selection and settings, and knows when it is out of date', async () => {
    const [a, b] = await Promise.all([useApp.getState().runCheck(), useApp.getState().runCheck()])
    expect(a).toBe(clean)
    expect(b).toBe(clean)
    expect(api.checkDocument).toHaveBeenCalledTimes(1)
    expect(useApp.getState().check).toMatchObject({ status: 'done', report: clean })
    expect(useApp.getState().isCheckCurrent()).toBe(true)
    useApp.getState().updateRule('b', { italic: true })
    expect(useApp.getState().isCheckCurrent()).toBe(false)
  })

  it('reports a failed check', async () => {
    api.checkDocument.mockRejectedValueOnce(
      new Error("Error invoking remote method 'x': Error: Please open the file again.")
    )
    expect(await useApp.getState().runCheck()).toBeNull()
    expect(useApp.getState().check).toMatchObject({
      status: 'failed',
      error: 'The content check did not finish. Please open the file again.'
    })
  })

  it('does nothing without a file or a selection', async () => {
    useApp.setState({ selected: [] })
    expect(await useApp.getState().runCheck()).toBeNull()
    expect(api.checkDocument).not.toHaveBeenCalled()
  })

  it('shows check progress without taking over the main job', async () => {
    await useApp.getState().init()
    const listener = api.onJobProgress.mock.calls[0][0] as Parameters<ElectronApi['onJobProgress']>[0]
    let finish!: (r: ContentReport) => void
    api.checkDocument.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
    const running = useApp.getState().runCheck()
    listener('check', { stage: 'checking', done: 1, total: 2 })
    expect(useApp.getState().check.progress).toEqual({ stage: 'checking', done: 1, total: 2 })
    expect(useApp.getState().job).toBeNull()
    finish(clean)
    await running
  })
})

describe('saving (store)', () => {
  it('checks first, then saves when nothing is wrong', async () => {
    expect(await useApp.getState().exportDocument()).toBe('saved')
    expect(api.checkDocument).toHaveBeenCalledTimes(1)
    expect(useApp.getState().exportResult).toBe(saved)
    // A current check is reused
    expect(await useApp.getState().exportDocument()).toBe('saved')
    expect(api.checkDocument).toHaveBeenCalledTimes(1)
  })

  it('stops for review when the check finds issues, and saves anyway when confirmed', async () => {
    api.checkDocument.mockResolvedValue(withIssue)
    expect(await useApp.getState().exportDocument()).toBe('review')
    expect(api.exportDocument).not.toHaveBeenCalled()
    expect(await useApp.getState().exportDocument(true)).toBe('saved')
    expect(api.exportDocument).toHaveBeenCalledTimes(1)
  })

  it('handles a cancelled dialog, a stopped save and a failed check', async () => {
    api.exportDocument.mockResolvedValueOnce(null)
    expect(await useApp.getState().exportDocument()).toBe('cancelled')
    api.exportDocument.mockRejectedValueOnce(new Error(CANCELLED_MESSAGE))
    expect(await useApp.getState().exportDocument()).toBe('cancelled')
    expect(useApp.getState().notice).toBe('Saving stopped. No file was written.')
    api.exportDocument.mockRejectedValueOnce(new Error('Disk full'))
    expect(await useApp.getState().exportDocument()).toBe('failed')
    expect(useApp.getState().error).toBe('Disk full')
    useApp.setState({ check: { status: 'idle', report: null, progress: null, error: null, key: null } })
    api.checkDocument.mockRejectedValueOnce(new Error('boom'))
    expect(await useApp.getState().exportDocument()).toBe('failed')
    useApp.setState({ selected: [] })
    expect(await useApp.getState().exportDocument()).toBe('failed')
  })

  it('saves the report as CSV', async () => {
    await useApp.getState().exportReport(withIssue.items)
    expect(api.exportReport.mock.calls[0][0]).toContain('Sheet,A1,issue,limit')
    expect(useApp.getState().notice).toBe('Saved the report as report.csv')
    api.exportReport.mockRejectedValueOnce(new Error('denied'))
    await useApp.getState().exportReport([])
    expect(useApp.getState().error).toBe('Could not save the report. denied')
  })
})

describe('tag styles with a built-in look (store)', () => {
  it('starts a new rule from the built-in look, and removes rules safely', () => {
    const config = defaultConfig()
    delete config.rules.h2
    useApp.setState({ config })
    useApp.getState().updateRule('h2', { italic: true })
    expect(useApp.getState().config!.rules.h2).toEqual({ bold: true, size: 16, italic: true })
    useApp.getState().removeRule('toString')
    useApp.getState().createPlainRule('constructor')
    expect(Object.hasOwn(useApp.getState().config!.rules, 'constructor')).toBe(true)
    expect(useApp.getState().config!.rules.constructor).toEqual({})
  })
})
