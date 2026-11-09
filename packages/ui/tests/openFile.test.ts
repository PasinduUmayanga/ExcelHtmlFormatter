// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DocumentSummary, ElectronApi, PickedFile } from '@hf/core'
import { useApp } from '../src/store'

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
    openDocument: vi.fn(async () => doc)
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
