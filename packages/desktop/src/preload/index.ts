// @hf/desktop/preload: the bridge between the window and the main process.
// Runs in a sandboxed preload, so it may only import 'electron' at runtime (type imports are fine).
import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { ElectronApi, JobKind, JobProgress } from '@hf/core'

/** Exposes the typed API as `window.api`. The window never gets direct access to Node or files. */
export function exposeApi(): void {
  const api: ElectronApi = {
    openFileDialog: (startIn) => ipcRenderer.invoke('file:open', startIn),
    getActivity: () => ipcRenderer.invoke('activity:list'),
    clearActivity: () => ipcRenderer.invoke('activity:clear'),
    getPreferences: () => ipcRenderer.invoke('preferences:get'),
    setTheme: (theme) => ipcRenderer.invoke('preferences:setTheme', theme),
    describeDroppedFile: (file) => ipcRenderer.invoke('file:describe', webUtils.getPathForFile(file)),
    openDocument: (path) => ipcRenderer.invoke('document:open', path),
    getSectionPreview: (path, section) => ipcRenderer.invoke('document:preview', path, section),
    exportDocument: (path, sections, config) => ipcRenderer.invoke('document:export', path, sections, config),
    checkDocument: (path, sections, config) => ipcRenderer.invoke('document:check', path, sections, config),
    exportReport: (csv) => ipcRenderer.invoke('report:export', csv),
    showInFolder: (path) => ipcRenderer.invoke('shell:showInFolder', path),
    cancelJob: (kind) => ipcRenderer.invoke('job:cancel', kind),
    onJobProgress: (listener) => {
      const handler = (_e: Electron.IpcRendererEvent, kind: JobKind, progress: JobProgress) => listener(kind, progress)
      ipcRenderer.on('job:progress', handler)
      return () => ipcRenderer.removeListener('job:progress', handler)
    },
    loadConfig: () => ipcRenderer.invoke('config:load'),
    saveConfig: (config) => ipcRenderer.invoke('config:save', config),
    exportConfig: (config) => ipcRenderer.invoke('config:export', config),
    importConfig: () => ipcRenderer.invoke('config:import'),
    getAppInfo: () => ipcRenderer.invoke('app:info')
  }
  contextBridge.exposeInMainWorld('api', api)
}
