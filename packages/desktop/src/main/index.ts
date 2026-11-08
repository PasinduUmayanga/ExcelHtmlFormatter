// @hf/desktop/main: the shared Electron main process. Each app calls startDesktopApp() once.
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import type { Worker, WorkerOptions } from 'node:worker_threads'
import { join, basename, dirname, extname, parse, resolve } from 'node:path'
import { readFile, writeFile, stat, mkdir, rename, rm } from 'node:fs/promises'
import {
  defaultConfig, validateConfig,
  type AppConfig, type AppInfo, type DocumentSummary, type ExportResult, type ExportStats, type FormatInfo,
  type JobKind, type JobProgress, type PickedFile
} from '@hf/core'
import { JobWorker } from './workerClient'

export interface DesktopAppOptions {
  /** Names, file types and words for this format */
  format: FormatInfo
  /**
   * Starts the app's worker thread. Comes from the app, because the worker entry file is bundled
   * by electron-vite with `import createWorker from './worker?nodeWorker'`.
   */
  createWorker: (options: WorkerOptions) => Worker
  /** Window icon for Windows/Linux (macOS uses the .icns in the app bundle) */
  icon?: string
  /** Built preload and window files, relative to the built main.js (defaults match electron-vite) */
  preloadPath?: string
  rendererHtmlPath?: string
}

/** Starts the app: one window, the IPC API from @hf/desktop/preload, and background workers. */
export function startDesktopApp(options: DesktopAppOptions): void {
  const { format } = options
  const preloadPath = options.preloadPath ?? join(__dirname, '../preload/preload.js')
  const rendererHtmlPath = options.rendererHtmlPath ?? join(__dirname, '../renderer/index.html')
  const extensions = format.fileTypes.flatMap((t) => t.extensions.map((e) => e.toLowerCase()))
  const configPath = () => join(app.getPath('userData'), 'config.json')

  /** Only files the user picked (dialog or drag-and-drop) may be read. */
  const pickedFiles = new Map<string, PickedFile>()
  /** Only files this app saved may be shown in their folder. */
  const savedFiles = new Set<string>()

  /*
   * All file work runs in worker threads, so the window never freezes:
   *  - `session`: the open file; its worker keeps the document in memory for previews.
   *  - `exportJob`: a short-lived worker that converts and saves a copy.
   */
  let session: { path: string; worker: JobWorker; loading: boolean } | null = null
  let exportJob: { worker: JobWorker } | null = null
  const newWorker = () => new JobWorker(options.createWorker)

  function createWindow(): void {
    const win = new BrowserWindow({
      width: 1240,
      height: 820,
      minWidth: 900,
      minHeight: 600,
      show: false,
      title: format.appName,
      icon: options.icon,
      autoHideMenuBar: true,
      backgroundColor: '#f6f7f9',
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })

    win.once('ready-to-show', () => win.show())

    // Links open in the user's browser, never inside the app window.
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//.test(url)) shell.openExternal(url)
      return { action: 'deny' }
    })
    // Hash-route changes (#/open, #/settings…) are allowed; leaving the app's page is not.
    win.webContents.on('will-navigate', (e, url) => {
      if (url.split('#')[0] !== win.webContents.getURL().split('#')[0]) e.preventDefault()
    })

    // If the window's page crashes, offer to reload it instead of leaving a blank window.
    win.webContents.on('render-process-gone', async (_e, details) => {
      if (details.reason === 'clean-exit') return
      const { response } = await dialog.showMessageBox(win, {
        type: 'error',
        title: format.appName,
        message: 'The window stopped working.',
        detail: 'Your tag styles are saved. Reload the window to continue.',
        buttons: ['Reload', 'Quit'],
        defaultId: 0
      })
      if (response === 0) win.reload()
      else app.quit()
    })

    const devUrl = process.env['ELECTRON_RENDERER_URL']
    if (!app.isPackaged && devUrl) win.loadURL(devUrl)
    else win.loadFile(rendererHtmlPath)
  }

  /* ---------- IPC: the only things the window can ask the Node side to do ---------- */

  async function describe(path: string): Promise<PickedFile> {
    const info = await stat(path)
    if (!info.isFile()) throw new Error('That is not a file.')
    const file = { path, name: basename(path), sizeBytes: info.size }
    pickedFiles.set(path, file)
    return file
  }

  ipcMain.handle('file:open', async (event): Promise<PickedFile | null> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const dialogOptions: Electron.OpenDialogOptions = {
      title: format.text.openTitle,
      properties: ['openFile'],
      filters: format.fileTypes
    }
    const result = win ? await dialog.showOpenDialog(win, dialogOptions) : await dialog.showOpenDialog(dialogOptions)
    if (result.canceled || result.filePaths.length === 0) return null
    return describe(result.filePaths[0])
  })

  ipcMain.handle('file:describe', (_e, path: unknown): Promise<PickedFile> => {
    if (typeof path !== 'string' || !path) throw new Error('No file path was received.')
    if (!extensions.includes(extname(path).slice(1).toLowerCase())) {
      throw new Error(`Only ${extensions.map((e) => '.' + e).join(', ')} files are supported.`)
    }
    return describe(path)
  })

  /** Sends job progress to the window that started the job (if it is still open). */
  function progressTo(sender: Electron.WebContents, kind: JobKind) {
    return (progress: JobProgress) => {
      if (!sender.isDestroyed()) sender.send('job:progress', kind, progress)
    }
  }

  ipcMain.handle('document:open', async (event, path: unknown): Promise<DocumentSummary> => {
    const file = typeof path === 'string' ? pickedFiles.get(path) : undefined
    if (!file) throw new Error('Please open the file again.')

    // One worker per open file. It keeps the document in memory for previews.
    session?.worker.terminate('Another file was opened.')
    const worker = newWorker()
    session = { path: file.path, worker, loading: true }
    try {
      const summary = await worker.request<DocumentSummary>({ type: 'load', file }, progressTo(event.sender, 'load'))
      if (session?.worker === worker) session.loading = false
      return summary
    } catch (e) {
      worker.terminate()
      if (session?.worker === worker) session = null
      throw e
    }
  })

  ipcMain.handle('document:preview', (_e, path: unknown, section: unknown): Promise<unknown> => {
    if (!session || session.loading || session.path !== path || typeof section !== 'string') {
      throw new Error('Please open the file again.')
    }
    return session.worker.request<unknown>({ type: 'preview', section })
  })

  ipcMain.handle('job:cancel', async (_e, kind: unknown) => {
    if (kind === 'load' && session?.loading) session.worker.terminate()
    if (kind === 'export' && exportJob) exportJob.worker.terminate()
  })

  ipcMain.handle('document:export', async (event, path: unknown, sections: unknown, config: unknown): Promise<ExportResult | null> => {
    const file = typeof path === 'string' ? pickedFiles.get(path) : undefined
    if (!file) throw new Error('Please open the file again.')
    if (!Array.isArray(sections) || !sections.every((s) => typeof s === 'string')) throw new Error(`No ${format.section.plural} were selected.`)
    const settings = validateConfig(config)

    const win = BrowserWindow.fromWebContents(event.sender)
    const dialogOptions: Electron.SaveDialogOptions = {
      title: 'Save formatted file',
      defaultPath: join(dirname(file.path), `${parse(file.name).name}${format.outputSuffix}.${format.outputExtension}`),
      filters: [{ name: format.fileTypes[0]?.name ?? 'File', extensions: [format.outputExtension] }]
    }
    const result = win ? await dialog.showSaveDialog(win, dialogOptions) : await dialog.showSaveDialog(dialogOptions)
    if (result.canceled || !result.filePath) return null

    let target = result.filePath
    if (extname(target).toLowerCase() !== `.${format.outputExtension}`) target += `.${format.outputExtension}`
    if (resolve(target).toLowerCase() === resolve(file.path).toLowerCase()) {
      throw new Error('Choose a different file name. The original file is never overwritten.')
    }

    if (exportJob) throw new Error('A file is already being saved.')
    // A separate worker, so Cancel can stop it without closing the open file.
    const worker = newWorker()
    exportJob = { worker }
    try {
      const stats = await worker.request<ExportStats>(
        { type: 'export', source: file.path, target, sections, config: settings },
        progressTo(event.sender, 'export')
      )
      savedFiles.add(target)
      return { path: target, fileName: basename(target), stats }
    } catch (e) {
      // A stopped worker cannot clean up after itself: remove its half-written temporary file.
      await rm(`${target}.saving`, { force: true }).catch(() => {})
      throw e
    } finally {
      worker.terminate('Finished.')
      exportJob = null
    }
  })

  ipcMain.handle('shell:showInFolder', (_e, path: unknown) => {
    if (typeof path === 'string' && savedFiles.has(path)) shell.showItemInFolder(path)
  })

  /* ---------- Tag-style settings ---------- */

  ipcMain.handle('config:load', async (): Promise<AppConfig> => {
    try {
      return validateConfig(JSON.parse(await readFile(configPath(), 'utf8')))
    } catch {
      return defaultConfig() // first run, or a missing / damaged file
    }
  })

  ipcMain.handle('config:save', async (_e, config: unknown): Promise<void> => {
    await writeJsonSafely(configPath(), validateConfig(config))
  })

  ipcMain.handle('config:export', async (event, config: unknown): Promise<string | null> => {
    const valid = validateConfig(config)
    const win = BrowserWindow.fromWebContents(event.sender)
    const dialogOptions: Electron.SaveDialogOptions = {
      title: 'Export tag styles',
      defaultPath: 'tag-styles.json',
      filters: [{ name: 'Tag styles', extensions: ['json'] }]
    }
    const result = win ? await dialog.showSaveDialog(win, dialogOptions) : await dialog.showSaveDialog(dialogOptions)
    if (result.canceled || !result.filePath) return null
    await writeJsonSafely(result.filePath, valid)
    return basename(result.filePath)
  })

  ipcMain.handle('config:import', async (event): Promise<AppConfig | null> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const dialogOptions: Electron.OpenDialogOptions = {
      title: 'Import tag styles',
      properties: ['openFile'],
      filters: [{ name: 'Tag styles', extensions: ['json'] }]
    }
    const result = win ? await dialog.showOpenDialog(win, dialogOptions) : await dialog.showOpenDialog(dialogOptions)
    if (result.canceled || result.filePaths.length === 0) return null
    let parsed: unknown
    try {
      parsed = JSON.parse(await readFile(result.filePaths[0], 'utf8'))
    } catch {
      throw new Error('That file is not valid JSON.')
    }
    const config = validateConfig(parsed)
    await writeJsonSafely(configPath(), config)
    return config
  })

  ipcMain.handle('app:info', (): AppInfo => ({
    version: app.getVersion(),
    platform: process.platform,
    configPath: configPath()
  }))

  /* ---------- App lifecycle ---------- */

  // Last line of defence: show unexpected errors instead of failing silently.
  process.on('uncaughtException', (err) => {
    console.error(err)
    dialog.showErrorBox(format.appName, 'Something unexpected went wrong:\n\n' + (err?.message ?? String(err)))
  })
  process.on('unhandledRejection', (reason) => console.error('Unhandled promise rejection:', reason))

  app.on('before-quit', () => {
    session?.worker.terminate('The app is closing.')
    exportJob?.worker.terminate('The app is closing.')
  })

  app.whenReady().then(() => {
    createWindow()
    // macOS: re-open a window when the dock icon is clicked.
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}

/** Writes to a temporary file first, so a crash mid-write can never leave a half-written file. */
async function writeJsonSafely(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.tmp`
  await writeFile(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8')
  await rename(tmp, path)
}
