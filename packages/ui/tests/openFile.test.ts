// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DocumentSummary, ElectronApi, PickedFile } from '@hf/core'
import { useApp } from '../src/state/store'

const picked: PickedFile = { path: 'C:/x.xlsx', name: 'x.xlsx', sizeBytes: 1 }
const doc: DocumentSummary = {
  file: picked,
  sections: [
    { name: 'A', state: 'visible', sizeLabel: '1', scan: { htmlCells: 2, tags: {} } },
    { name: 'B', state: 'hidden', sizeLabel: '1', scan: { htmlCells: 1, tags: {} } },
    { name: 'C', state: 'visible', sizeLabel: '1', scan: { htmlCells: 0, tags: {} } }
  ]
}

let api: Partial<Record<keyof ElectronApi, ReturnType<typeof vi.fn>>>
beforeEach(() => {
  api = {
    openFileDialog: vi.fn(async () => picked),
    describeDroppedFile: vi.fn(async () => picked),
    openDocument: vi.fn(async () => doc),
    openSample: vi.fn(async () => picked)
  }
  ;(window as unknown as { api: typeof api }).api = api
  useApp.setState({ doc: null, selected: [], loading: false, error: null })
})

describe('opening a file (store)', () => {
  it('opens the file picked in the Open dialog and selects visible sections with HTML', async () => {
    expect(await useApp.getState().browseForFile()).toBe(true)
    expect(api.openDocument).toHaveBeenCalledWith('C:/x.xlsx')
    expect(useApp.getState().selected).toEqual(['A'])
  })

  it('does nothing when the dialog is cancelled or a file is already opening', async () => {
    api.openFileDialog!.mockResolvedValueOnce(null)
    expect(await useApp.getState().browseForFile()).toBe(false)
    useApp.setState({ loading: true })
    expect(await useApp.getState().browseForFile()).toBe(false)
    expect(await useApp.getState().openDroppedFile(new File(['x'], 'x.xlsx'))).toBe(false)
    expect(api.openDocument).not.toHaveBeenCalled()
  })

  it('opens a dropped file', async () => {
    const dropped = new File(['x'], 'x.xlsx')
    expect(await useApp.getState().openDroppedFile(dropped)).toBe(true)
    expect(api.describeDroppedFile).toHaveBeenCalledWith(dropped)
  })

  it('shows why a file could not be picked or dropped', async () => {
    api.openFileDialog!.mockRejectedValueOnce(new Error("Error invoking remote method 'x': Error: Not allowed"))
    expect(await useApp.getState().browseForFile()).toBe(false)
    expect(useApp.getState().error).toBe('Not allowed')
    api.describeDroppedFile!.mockRejectedValueOnce(new Error('Only .xlsx files can be opened'))
    expect(await useApp.getState().openDroppedFile(new File(['x'], 'x.txt'))).toBe(false)
    expect(useApp.getState().error).toBe('Only .xlsx files can be opened')
  })
})

describe('Upload: sample and Remove (store)', () => {
  it('opens the sample that ships with the app, and says so when there is none', async () => {
    expect(await useApp.getState().openSample()).toBe(true)
    expect(api.openDocument).toHaveBeenCalledWith('C:/x.xlsx')
    api.openSample!.mockResolvedValueOnce(null)
    expect(await useApp.getState().openSample()).toBe(false)
    expect(useApp.getState().error).toBe('This app has no sample file.')
    api.openSample!.mockRejectedValueOnce(new Error('ENOENT'))
    expect(await useApp.getState().openSample()).toBe(false)
    expect(useApp.getState().error).toBe('Could not open the sample. ENOENT')
  })

  it('Remove closes the file but keeps the workflow open', async () => {
    useApp.setState({ workflowActive: true })
    await useApp.getState().browseForFile()
    useApp.getState().closeFile()
    expect(useApp.getState().doc).toBeNull()
    expect(useApp.getState().selected).toEqual([])
    expect(useApp.getState().workflowActive).toBe(true)
  })
})

describe('Favorites (store)', () => {
  it('shows the list the main process returns, and says why a change failed', async () => {
    const starred = [{ fileName: 'x.xlsx', folder: 'C:/', at: '2026-11-10T10:00:00.000Z' }]
    api.toggleFavorite = vi.fn(async () => starred)
    await useApp.getState().toggleFavorite('x.xlsx', 'C:/')
    expect(api.toggleFavorite).toHaveBeenCalledWith('x.xlsx', 'C:/')
    expect(useApp.getState().favorites).toEqual(starred)
    api.toggleFavorite.mockRejectedValueOnce(new Error('disk full'))
    await useApp.getState().toggleFavorite('x.xlsx', 'C:/')
    expect(useApp.getState().favorites).toEqual(starred)
    expect(useApp.getState().error).toBe('Could not change Favorites. disk full')
    api.getFavorites = vi.fn(async () => [])
    await useApp.getState().loadFavorites()
    expect(useApp.getState().favorites).toEqual([])
  })
})

describe('Formatting profiles (store)', () => {
  it('switches the active styles, and shows why a change failed', async () => {
    const list = [
      { name: 'Client A', ruleCount: 3, active: true },
      { name: 'Default', ruleCount: 21, active: false }
    ]
    const clientA = { version: 2, profileName: 'Client A', unknownTagAction: 'strip' as const, rules: {} }
    api.activateProfile = vi.fn(async () => clientA)
    api.getProfiles = vi.fn(async () => list)
    expect(await useApp.getState().activateProfile('Client A')).toBe(true)
    expect(useApp.getState().config).toEqual(clientA)
    expect(useApp.getState().profiles).toEqual(list)

    api.renameProfile = vi.fn(async () => [{ ...list[0], name: 'Client B' }, list[1]])
    expect(await useApp.getState().renameProfile('Client A', ' Client B ')).toBe(true)
    expect(useApp.getState().config?.profileName).toBe('Client B')

    api.createProfile = vi.fn(async () => {
      throw new Error(
        'Error invoking remote method \'profiles:create\': Error: There is already a profile called "Default".'
      )
    })
    expect(await useApp.getState().createProfile('Default', null)).toBe(false)
    expect(useApp.getState().error).toBe('There is already a profile called "Default".')
  })
})

describe('Templates (store)', () => {
  const weekly = {
    name: 'Weekly',
    fileType: 'excel',
    action: 'format-html',
    profile: 'Default',
    sheets: 'all' as const
  }

  it('starts a task with the template: action, profile and every section ticked', async () => {
    useApp.setState({ config: { version: 2, profileName: 'Default', unknownTagAction: 'strip', rules: {} } })
    expect(await useApp.getState().startTemplate(weekly, 'excel')).toBe(true)
    expect(useApp.getState()).toMatchObject({ workflowActive: true, homeAction: 'format-html', sheetRule: 'all' })
    await useApp.getState().browseForFile()
    expect(useApp.getState().selected).toEqual(['A', 'B', 'C'])
    // Starting from Home again goes back to the usual choice
    useApp.getState().startWorkflow()
    expect(useApp.getState().sheetRule).toBe('html')
  })

  it("refuses an action this app can't run, and a profile that is gone", async () => {
    expect(await useApp.getState().startTemplate({ ...weekly, action: 'excel-to-pdf' }, 'excel')).toBe(false)
    expect(useApp.getState().error).toBe('"Weekly" uses an action this app can\'t run yet.')
    api.activateProfile = vi.fn(async () => {
      throw new Error('That profile no longer exists.')
    })
    expect(await useApp.getState().startTemplate({ ...weekly, profile: 'Gone' }, 'excel')).toBe(false)
    expect(useApp.getState().error).toBe('That profile no longer exists.')
  })
})
