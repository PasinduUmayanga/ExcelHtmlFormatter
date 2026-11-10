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
    getFavorites: () => ipcRenderer.invoke('favorites:list'),
    toggleFavorite: (fileName, folder) => ipcRenderer.invoke('favorites:toggle', fileName, folder),
    getPreferences: () => ipcRenderer.invoke('preferences:get'),
    setTheme: (theme) => ipcRenderer.invoke('preferences:setTheme', theme),
    openSample: () => ipcRenderer.invoke('file:sample'),
    describeDroppedFile: (file) => ipcRenderer.invoke('file:describe', webUtils.getPathForFile(file)),
    openDocument: (path) => ipcRenderer.invoke('document:open', path),
    getSectionPreview: (path, section) => ipcRenderer.invoke('document:preview', path, section),
    exportDocument: (path, sections, config, suggestedName) =>
      ipcRenderer.invoke('document:export', path, sections, config, suggestedName),
    checkDocument: (path, sections, config) => ipcRenderer.invoke('document:check', path, sections, config),
    exportReport: (csv) => ipcRenderer.invoke('report:export', csv),
    showInFolder: (path) => ipcRenderer.invoke('shell:showInFolder', path),
    openSavedFile: (path) => ipcRenderer.invoke('shell:openSaved', path),
    cancelJob: (kind) => ipcRenderer.invoke('job:cancel', kind),
    onJobProgress: (listener) => {
      const handler = (_e: Electron.IpcRendererEvent, kind: JobKind, progress: JobProgress) => listener(kind, progress)
      ipcRenderer.on('job:progress', handler)
      return () => ipcRenderer.removeListener('job:progress', handler)
    },
    loadConfig: () => ipcRenderer.invoke('config:load'),
    saveConfig: (config) => ipcRenderer.invoke('config:save', config),
    getProfiles: () => ipcRenderer.invoke('profiles:list'),
    createProfile: (name, copyFrom) => ipcRenderer.invoke('profiles:create', name, copyFrom),
    renameProfile: (from, to) => ipcRenderer.invoke('profiles:rename', from, to),
    deleteProfile: (name) => ipcRenderer.invoke('profiles:delete', name),
    activateProfile: (name) => ipcRenderer.invoke('profiles:activate', name),
    getTemplates: () => ipcRenderer.invoke('templates:list'),
    saveTemplate: (template) => ipcRenderer.invoke('templates:save', template),
    deleteTemplate: (name) => ipcRenderer.invoke('templates:delete', name),
    exportConfig: (config) => ipcRenderer.invoke('config:export', config),
    importConfig: () => ipcRenderer.invoke('config:import'),
    getAppInfo: () => ipcRenderer.invoke('app:info')
  }
  contextBridge.exposeInMainWorld('api', api)
}
