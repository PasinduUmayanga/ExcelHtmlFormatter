// @hf/desktop/main: the shared Electron main process. Each app calls startDesktopApp() once.
import { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell } from 'electron'
import type { Worker, WorkerOptions } from 'node:worker_threads'
import { join, basename, dirname, extname, parse, resolve } from 'node:path'
import { readFile, writeFile, stat, mkdir, rename, rm } from 'node:fs/promises'
import {
  CANCELLED_MESSAGE,
  defaultConfig,
  validateConfig,
  type AppConfig,
  type AppInfo,
  type ContentReport,
  type SaveVerification,
  type DocumentSummary,
  type ExportResult,
  type ExportStats,
  type ActivityEntry,
  type FavoriteFile,
  type WorkflowTemplate,
  type FormatInfo,
  type Preferences,
  type JobKind,
  type JobProgress,
  type PickedFile
} from '@hf/core'
import { JobWorker } from './workerClient'
import { outputFileName, reportText, sectionList, unreadableSave } from './ipcChecks'
import { userDataPath } from './userData'
import { addActivity, knownFolder, parseActivity } from './activity'
import { parseFavorites, toggleFavorite } from './favorites'
import * as profiles from './profiles'
import { deleteTemplate, parseTemplates, saveTemplate } from './templates'
import { isTheme, parsePreferences, windowBackground } from './preferences'

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
  /** A sample file shipped with the app, for "Load sample" on the Upload screen (ADR 0017). Leave out for none. */
  samplePath?: string
  /**
   * Settings folder name inside the system's app-data folder, when it differs from the product name
   * (e.g. the name before a rename). Leave out to use Electron's default.
   */
  userDataFolder?: string
  /** Built preload and window files, relative to the built main.js (defaults match electron-vite) */
  preloadPath?: string
  rendererHtmlPath?: string
}

/** Starts the app: one window, the IPC API from @hf/desktop/preload, and background workers. */
export function startDesktopApp(options: DesktopAppOptions): void {
  const { format } = options
  // Must happen before the app is ready, before anything reads or writes the settings folder.
  const settingsFolder = userDataPath(
    app.getPath('appData'),
    options.userDataFolder,
    app.commandLine.hasSwitch('user-data-dir')
  )
  if (settingsFolder) app.setPath('userData', settingsFolder)
  const preloadPath = options.preloadPath ?? join(__dirname, '../preload/preload.js')
  const rendererHtmlPath = options.rendererHtmlPath ?? join(__dirname, '../renderer/index.html')
  const extensions = format.fileTypes.flatMap((t) => t.extensions.map((e) => e.toLowerCase()))
  const configPath = () => join(app.getPath('userData'), 'config.json')
  const activityPath = () => join(app.getPath('userData'), 'activity.json')
  const favoritesPath = () => join(app.getPath('userData'), 'favorites.json')
  const profilesPath = () => join(app.getPath('userData'), 'profiles.json')
  const templatesPath = () => join(app.getPath('userData'), 'templates.json')
  const preferencesPath = () => join(app.getPath('userData'), 'preferences.json')
  const loadPreferences = (): Promise<Preferences> =>
    readFile(preferencesPath(), 'utf8')
      .then((json) => parsePreferences(JSON.parse(json)))
      .catch(() => parsePreferences(undefined))

  /*
   * Recent activity: read once, then kept in memory. Writes run one at a time, in order. A failure to
   * record activity never fails the open or save it describes.
   */
  let activity: Promise<ActivityEntry[]> | null = null
  const loadActivity = () =>
    (activity ??= readFile(activityPath(), 'utf8')
      .then((json) => parseActivity(JSON.parse(json)))
      .catch(() => []))
  function updateActivity(change: (list: ActivityEntry[]) => ActivityEntry[]): Promise<void> {
    const next = loadActivity().then(change)
    activity = next
    return next.then((list) => writeJsonSafely(activityPath(), list))
  }
  /* Favourites: like the activity, read once and written one at a time (ADR 0017). */
  let favorites: Promise<FavoriteFile[]> | null = null
  const loadFavorites = () =>
    (favorites ??= readFile(favoritesPath(), 'utf8')
      .then((text) => parseFavorites(JSON.parse(text)))
      .catch(() => []))
  function updateFavorites(change: (list: FavoriteFile[]) => FavoriteFile[] | Promise<FavoriteFile[]>) {
    const next = loadFavorites().then(change)
    favorites = next
    return next.then(async (list) => {
      await writeJsonSafely(favoritesPath(), list)
      return list
    })
  }

  const recordActivity = (entry: ActivityEntry) =>
    updateActivity((list) => addActivity(list, entry)).catch((e: Error) =>
      console.warn('Could not record recent activity:', e.message)
    )

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
      backgroundColor: windowBackground(nativeTheme.shouldUseDarkColors),
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

  ipcMain.handle('file:open', async (event, startIn: unknown): Promise<PickedFile | null> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const dialogOptions: Electron.OpenDialogOptions = {
      title: format.text.openTitle,
      properties: ['openFile'],
      filters: format.fileTypes,
      // Only a folder from the recent activity or the favourites.
      defaultPath: knownFolder([...(await loadActivity()), ...(await loadFavorites())], startIn)
    }
    const result = win ? await dialog.showOpenDialog(win, dialogOptions) : await dialog.showOpenDialog(dialogOptions)
    if (result.canceled || result.filePaths.length === 0) return null
    return describe(result.filePaths[0])
  })

  // The sample counts as picked: it is the app's own file, chosen by the user with "Load sample".
  ipcMain.handle('file:sample', (): Promise<PickedFile> | null =>
    options.samplePath ? describe(options.samplePath) : null
  )

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
      void recordActivity({
        kind: 'opened',
        fileName: file.name,
        folder: dirname(file.path),
        at: new Date().toISOString()
      })
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

  // 'check' is not cancellable: it runs in the open file's worker, and stopping that worker would close the file.
  ipcMain.handle('job:cancel', async (_e, kind: unknown) => {
    if (kind === 'load' && session?.loading) session.worker.terminate()
    if (kind === 'export' && exportJob) exportJob.worker.terminate()
  })

  ipcMain.handle(
    'document:check',
    (event, path: unknown, sections: unknown, config: unknown): Promise<ContentReport> => {
      if (!session || session.loading || session.path !== path) throw new Error('Please open the file again.')
      return session.worker.request<ContentReport>(
        { type: 'check', sections: sectionList(sections, format.section.plural), config: validateConfig(config) },
        progressTo(event.sender, 'check')
      )
    }
  )

  ipcMain.handle('report:export', async (event, csv: unknown): Promise<string | null> => {
    const text = reportText(csv)
    const win = BrowserWindow.fromWebContents(event.sender)
    const dialogOptions: Electron.SaveDialogOptions = {
      title: 'Export content check',
      defaultPath: 'content-check.csv',
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    }
    const result = win ? await dialog.showSaveDialog(win, dialogOptions) : await dialog.showSaveDialog(dialogOptions)
    if (result.canceled || !result.filePath) return null
    if (pickedFiles.has(result.filePath))
      throw new Error('Choose a different file name. Opened files are never overwritten.')
    await writeFile(result.filePath, text, 'utf8')
    return basename(result.filePath)
  })

  ipcMain.handle(
    'document:export',
    async (event, path: unknown, sections: unknown, config: unknown, name: unknown): Promise<ExportResult | null> => {
      const file = typeof path === 'string' ? pickedFiles.get(path) : undefined
      if (!file) throw new Error('Please open the file again.')
      const chosen = sectionList(sections, format.section.plural)
      const settings = validateConfig(config)

      const win = BrowserWindow.fromWebContents(event.sender)
      const dialogOptions: Electron.SaveDialogOptions = {
        title: 'Save formatted file',
        defaultPath: join(
          dirname(file.path),
          outputFileName(name, `${parse(file.name).name}${format.outputSuffix}`, format.outputExtension)
        ),
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
      const progress = progressTo(event.sender, 'export')
      try {
        let stats: ExportStats
        try {
          stats = await worker.request<ExportStats>(
            { type: 'export', source: file.path, target, sections: chosen, config: settings },
            progress
          )
        } catch (e) {
          // A stopped worker cannot clean up after itself: remove its half-written temporary file.
          await rm(`${target}.saving`, { force: true }).catch(() => {})
          throw e
        }
        savedFiles.add(target)
        // The file is saved. From here, Cancel (or a failure) only skips the check, never the save.
        let verification: SaveVerification | null
        try {
          verification = await worker.request<SaveVerification>(
            { type: 'verify', target, sections: chosen, config: settings },
            progress
          )
        } catch (e) {
          const message = (e as Error).message
          verification = message === CANCELLED_MESSAGE ? null : unreadableSave(message)
        }
        void recordActivity({
          kind: 'saved',
          fileName: basename(target),
          folder: dirname(target),
          at: new Date().toISOString(),
          sourceName: file.name,
          converted: stats.converted,
          check: verification === null ? 'not-checked' : verification.differences ? 'differences' : 'verified',
          differences: verification?.differences ?? 0
        })
        return { path: target, fileName: basename(target), stats, verification }
      } finally {
        worker.terminate('Finished.')
        exportJob = null
      }
    }
  )

  ipcMain.handle('shell:showInFolder', (_e, path: unknown) => {
    if (typeof path === 'string' && savedFiles.has(path)) shell.showItemInFolder(path)
  })

  // Only a file this app saved in this session; the system opens it in its usual program.
  ipcMain.handle('shell:openSaved', async (_e, path: unknown): Promise<void> => {
    if (typeof path !== 'string' || !savedFiles.has(path))
      throw new Error('Only a file saved by this app can be opened.')
    const problem = await shell.openPath(path)
    if (problem) throw new Error(problem)
  })

  /* ---------- Recent activity (read and clear only: the main process records it) ---------- */

  ipcMain.handle('activity:list', (): Promise<ActivityEntry[]> => loadActivity())
  ipcMain.handle('activity:clear', (): Promise<void> => updateActivity(() => []))
  ipcMain.handle('favorites:list', (): Promise<FavoriteFile[]> => loadFavorites())
  ipcMain.handle('favorites:toggle', async (_e, fileName: unknown, folder: unknown): Promise<FavoriteFile[]> =>
    updateFavorites(async (list) =>
      toggleFavorite(list, await loadActivity(), fileName, folder, new Date().toISOString())
    )
  )

  /* ---------- Window preferences (theme) ---------- */

  ipcMain.handle('preferences:get', (): Promise<Preferences> => loadPreferences())
  ipcMain.handle('preferences:setTheme', async (_e, theme: unknown): Promise<void> => {
    if (!isTheme(theme)) throw new Error('Unknown theme.')
    nativeTheme.themeSource = theme
    await writeJsonSafely(preferencesPath(), { ...(await loadPreferences()), theme })
  })

  /* ---------- Tag-style settings ---------- */

  /** The active profile (config.json): defaults on first run, or when the file is missing or damaged. */
  async function readActive(): Promise<AppConfig> {
    try {
      return validateConfig(JSON.parse(await readFile(configPath(), 'utf8')))
    } catch {
      return defaultConfig()
    }
  }
  /** All profiles: the active one (config.json) and the others (profiles.json, ADR 0018). */
  async function readProfiles(): Promise<profiles.Profiles> {
    const active = await readActive()
    let stored: unknown = null
    try {
      stored = JSON.parse(await readFile(profilesPath(), 'utf8'))
    } catch {
      // none yet, or damaged: only the active profile
    }
    return { active, others: profiles.parseOtherProfiles(stored, active) }
  }
  /**
   * Writes a change. When the active profile changes, the others are written first with both profiles in them, so
   * a crash in between loses nothing (the duplicate is dropped when read).
   */
  let profileWrites: Promise<unknown> = Promise.resolve()
  function changeProfiles(change: (p: profiles.Profiles) => profiles.Profiles): Promise<profiles.Profiles> {
    const run = profileWrites.then(async () => {
      const before = await readProfiles()
      const after = change(before)
      if (after.active !== before.active) {
        await writeJsonSafely(profilesPath(), { version: 1, profiles: [...after.others, before.active] })
        await writeJsonSafely(configPath(), after.active)
      }
      await writeJsonSafely(profilesPath(), { version: 1, profiles: after.others })
      return after
    })
    profileWrites = run.catch(() => {})
    return run
  }

  ipcMain.handle('config:load', (): Promise<AppConfig> => readActive())

  // Saves the active profile's styles; its name stays (renaming is renameProfile, which checks for duplicates).
  ipcMain.handle('config:save', async (_e, config: unknown): Promise<void> => {
    const valid = validateConfig(config)
    await profileWrites
    await writeJsonSafely(configPath(), { ...valid, profileName: (await readActive()).profileName })
  })

  ipcMain.handle('profiles:list', async () => profiles.summarize(await readProfiles()))

  /* Templates (ADR 0018): read, change and write one at a time. */
  let templateWrites: Promise<unknown> = Promise.resolve()
  const readTemplates = async (): Promise<WorkflowTemplate[]> => {
    try {
      return parseTemplates(JSON.parse(await readFile(templatesPath(), 'utf8')))
    } catch {
      return []
    }
  }
  function changeTemplates(change: (list: WorkflowTemplate[]) => WorkflowTemplate[]): Promise<WorkflowTemplate[]> {
    const run = templateWrites.then(async () => {
      const list = change(await readTemplates())
      await writeJsonSafely(templatesPath(), { version: 1, templates: list })
      return list
    })
    templateWrites = run.catch(() => {})
    return run
  }
  ipcMain.handle('templates:list', (): Promise<WorkflowTemplate[]> => readTemplates())
  ipcMain.handle('templates:save', (_e, template: unknown) => changeTemplates((list) => saveTemplate(list, template)))
  ipcMain.handle('templates:delete', (_e, name: unknown) => changeTemplates((list) => deleteTemplate(list, name)))
  ipcMain.handle('profiles:create', async (_e, name: unknown, copyFrom: unknown) =>
    profiles.summarize(await changeProfiles((p) => profiles.createProfile(p, name, copyFrom)))
  )
  ipcMain.handle('profiles:rename', async (_e, from: unknown, to: unknown) =>
    profiles.summarize(await changeProfiles((p) => profiles.renameProfile(p, from, to)))
  )
  ipcMain.handle('profiles:delete', async (_e, name: unknown) =>
    profiles.summarize(await changeProfiles((p) => profiles.deleteProfile(p, name)))
  )
  ipcMain.handle(
    'profiles:activate',
    async (_e, name: unknown): Promise<AppConfig> =>
      (await changeProfiles((p) => profiles.activateProfile(p, name))).active
  )

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
    // The imported styles replace the active profile's; the profile keeps its name.
    const config = { ...validateConfig(parsed), profileName: (await readActive()).profileName }
    await profileWrites
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

  // The saved theme is applied before the window exists, so it opens in the right colours.
  app.whenReady().then(async () => {
    nativeTheme.themeSource = (await loadPreferences()).theme
    // Keep the window background in step (seen while resizing, and before a reload paints).
    nativeTheme.on('updated', () => {
      for (const w of BrowserWindow.getAllWindows())
        w.setBackgroundColor(windowBackground(nativeTheme.shouldUseDarkColors))
    })
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
