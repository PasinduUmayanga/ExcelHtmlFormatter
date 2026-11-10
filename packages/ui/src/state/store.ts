/// <reference path="../env.d.ts" />
/// <reference path="../css.d.ts" />
import { create } from 'zustand'
import {
  CANCELLED_MESSAGE,
  builtinStyle,
  cleanStyle,
  defaultConfig,
  reportToCsv,
  type ActivityEntry,
  type AppConfig,
  type AppInfo,
  type ThemeChoice,
  type ContentReport,
  type DocumentSummary,
  type ExportResult,
  type FavoriteFile,
  type ProfileSummary,
  type WorkflowTemplate,
  type JobKind,
  type JobProgress,
  type PickedFile,
  type TagStyle,
  type UnknownTagAction
} from '@hf/core'
import { actionOf, availabilityOf, firstReadyAction, type FileTypeId } from '../features/workflow/registry'

/**
 * App data: the open document, the selection, settings and running jobs.
 * Where the user *is* (screen, section tab, view mode, tag being edited) lives in the
 * router (see router.tsx), not here.
 */
export interface AppState {
  /** The file being read, shown while `loading` is true. */
  pendingFile: PickedFile | null
  loading: boolean
  doc: DocumentSummary | null
  /** The last document screen visited (an in-app address), for Home's "Continue". Null when no file is open. */
  lastStep: string | null
  rememberStep(address: string): void
  /** Names of the sections the user ticked, in document order. */
  selected: string[]
  config: AppConfig | null
  appInfo: AppInfo | null
  error: string | null

  /** Starts the app: listens for job progress (once) and loads what the screens need (see `startup`). */
  init(): Promise<void>
  /**
   * Start-up: the settings and app details every screen needs. 'loading' until they arrive (the window shows
   * the startup screen), 'failed' with a message if they can't be read (the startup screen offers Try again).
   */
  startup: { status: 'loading' | 'ready' | 'failed'; error: string | null }
  /** Loads the settings and app details again (Try again on the startup screen). */
  retryStartup(): Promise<void>
  /** Opens a file. Resolves to true when it is ready to show. */
  openFile(file: PickedFile): Promise<boolean>
  /**
   * Asks for a file with the Open dialog, then opens it. False when cancelled, busy or it failed.
   * `startIn`: a folder from the recent activity to start the dialog in.
   */
  browseForFile(startIn?: string): Promise<boolean>
  /** Light, dark or follow the system. Applied by the main process (window, dialogs, menus). */
  theme: ThemeChoice
  /** Applies and saves a theme. On failure the previous theme stays and an error is shown. */
  setTheme(theme: ThemeChoice): Promise<void>
  /** Recent actions for the Home screen, newest first (recorded by the main process). */
  activity: ActivityEntry[]
  /** Reloads the recent actions. A failure leaves the list as it was (it is only a convenience). */
  loadActivity(): Promise<void>
  /** Empties the recent actions list. */
  clearActivity(): Promise<void>
  /** Starred files (Favorites), newest first, stored by the main process. */
  favorites: FavoriteFile[]
  loadFavorites(): Promise<void>
  /** Stars or unstars a recent file. */
  toggleFavorite(fileName: string, folder: string): Promise<void>
  /** Opens a file dropped on the window. False when busy or it failed. */
  openDroppedFile(file: File): Promise<boolean>
  /** Opens the sample file that ships with the app ("Load sample", ADR 0017). False when there is none or it failed. */
  openSample(): Promise<boolean>
  /** Closes the open file (Upload's Remove). The workflow stays unlocked. */
  closeFile(): void
  toggleSection(name: string): void
  selectAllSections(selected: boolean): void
  setError(message: string | null): void

  /**
   * The running load or export (null when nothing is running). `progress` stays null until
   * the work really starts (for an export: after the Save dialog closes).
   */
  job: { kind: JobKind; progress: JobProgress | null } | null
  cancelJob(): void

  /** A short success message shown as a toast. */
  notice: string | null
  notify(message: string): void

  /* Formatting profiles (ADR 0018): the active one's styles are `config`. */
  profiles: ProfileSummary[]
  loadProfiles(): Promise<void>
  /** Resolves to false (with the reason shown) when it can't be done, e.g. a name already used. */
  createProfile(name: string, copyFrom: string | null): Promise<boolean>
  renameProfile(from: string, to: string): Promise<boolean>
  deleteProfile(name: string): Promise<boolean>
  /** Makes a profile active: its styles become `config` (the content check runs again). */
  activateProfile(name: string): Promise<boolean>

  /* Templates (ADR 0018): saved setups to start a task with */
  templates: WorkflowTemplate[]
  loadTemplates(): Promise<void>
  saveTemplate(template: WorkflowTemplate): Promise<boolean>
  deleteTemplate(name: string): Promise<boolean>
  /**
   * Starts a task with a template: its file type and action (only if this app can run it), its profile, and which
   * sections to tick when the file opens. False, with the reason shown, when it can't.
   */
  startTemplate(template: WorkflowTemplate, appFormatId: string): Promise<boolean>
  /** Which sections are ticked when a file opens: visible ones with HTML (usual) or all (a template's choice). */
  sheetRule: 'html' | 'all'

  /* Tag styles: every change is saved to disk automatically. */
  updateRule(tag: string, patch: Partial<TagStyle>): void
  /** Gives a tag an empty rule: its text stays plain, and it is no longer reported as "no style". */
  createPlainRule(tag: string): void
  removeRule(tag: string): void
  setUnknownTagAction(action: UnknownTagAction): void
  resetConfig(): void
  importConfig(): Promise<void>
  exportConfig(): Promise<void>

  /* Preview & export */
  /** Preview data per section; its shape belongs to the app's format. */
  previews: Record<string, unknown>
  loadPreview(section: string): Promise<void>
  exporting: boolean
  exportResult: ExportResult | null
  /**
   * Saves the formatted copy. Checks the content first (unless a current check exists); if the check
   * finds issues, nothing is saved and 'review' is returned, unless `acceptIssues` is set
   * ("Save anyway", decision E7). A clean save (no known issues, and the saved file matches or its check was
   * stopped) closes the file, ends the workflow and returns 'completed'; a save with problems returns 'saved'
   * and keeps the file open so the problems can be reviewed.
   */
  exportDocument(acceptIssues?: boolean): Promise<'completed' | 'saved' | 'review' | 'cancelled' | 'failed'>
  /** Shows the last saved file in its folder (the open document's save, or the one Home reports). */
  showInFolder(): void
  /** Opens the last saved file in its usual program (Export & complete). */
  openSavedFile(): Promise<void>
  /** The file name typed on the Export screen for the Save dialog; empty for the usual name. */
  outputName: string
  setOutputName(name: string): void
  /** The name of the file the last clean save was made from (Export & complete's summary). */
  lastSavedSource: string | null
  dismissExportResult(): void

  /*
   * The workflow (Open file → Preview & export) is unlocked by picking an item on Home, and ends with a
   * clean save: the file is closed and Home shows `lastSaved`. Going Home in between keeps it unlocked.
   */
  workflowActive: boolean
  /** Home's choice: the kind of file (step 1) and the action for it (step 2; null when none is chosen or ready) */
  homeType: FileTypeId
  homeAction: string | null
  /** Chooses a file type; keeps the action if it belongs to that type, otherwise picks its first ready action. */
  setHomeType(type: FileTypeId, appFormatId: string): void
  setHomeAction(actionId: string | null): void
  /** Unlocks the workflow (Home's "Format an Excel file", "Open again"). Clears Home's save message. */
  startWorkflow(): void
  /** The last clean save, shown on Home until dismissed or the next workflow starts. */
  lastSaved: ExportResult | null
  dismissLastSaved(): void

  /* Content check (checks A and D, before saving) */
  check: ContentCheck
  /** Checks the selected sections with the current settings. Resolves to null if the check failed. */
  runCheck(): Promise<ContentReport | null>
  /** True if the last check matches the open file, selection and settings */
  isCheckCurrent(): boolean
  /** Saves the check report (or the saved file's differences) as CSV */
  exportReport(items: ContentReport['items']): Promise<void>
}

export interface ContentCheck {
  status: 'idle' | 'running' | 'done' | 'failed'
  report: ContentReport | null
  progress: JobProgress | null
  error: string | null
  /** What the report was made for (file, selection, settings), to tell when it is out of date */
  key: string | null
}

const idleCheck: ContentCheck = { status: 'idle', report: null, progress: null, error: null, key: null }

/** Identifies what a check covers: a new file, selection or settings needs a new check. */
function checkKey(state: Pick<AppState, 'doc' | 'selected' | 'config'>): string | null {
  if (!state.doc || !state.config) return null
  return JSON.stringify([state.doc.file.path, state.selected, state.config.rules, state.config.unknownTagAction])
}

/** The running check, shared so a second request waits for the first instead of starting another. */
let runningCheck: { key: string; promise: Promise<ContentReport | null> } | null = null

/** Which screens can be visited right now (used by route guards and the sidebar). */
export function canVisit(
  state: Pick<AppState, 'doc' | 'loading' | 'selected' | 'workflowActive'>,
  screen: 'sections' | 'analysis' | 'preview'
): boolean {
  if (!state.workflowActive || state.loading || !state.doc) return false
  return screen === 'sections' || state.selected.length > 0
}

/* Saves are queued so only one write runs at a time and only the latest config is written. */
let saving = false
let queued: AppConfig | null = null
async function persist(config: AppConfig, onError: (message: string) => void) {
  queued = config
  if (saving) return
  saving = true
  try {
    while (queued) {
      const next = queued
      queued = null
      await window.api.saveConfig(next)
    }
  } catch (e) {
    onError('Could not save tag styles: ' + cleanError(e))
  } finally {
    saving = false
  }
}

let noticeTimer: ReturnType<typeof setTimeout> | undefined

/** Main-process errors arrive as "Error invoking remote method 'x': Error: <message>". */
export const cleanError = (e: unknown) => String((e as Error)?.message ?? e).replace(/^.*Error: /, '')

const closedDocument = {
  doc: null,
  lastStep: null,
  selected: [],
  previews: {},
  exportResult: null,
  check: idleCheck,
  outputName: ''
}

/** True once the job-progress listener is registered (it must be registered only once). */
let listening = false

export const useApp = create<AppState>((set, get) => {
  /** Shows the saved theme in the header (main already applied it before the window opened). */
  const loadTheme = async () => {
    try {
      set({ theme: (await window.api.getPreferences()).theme })
    } catch {
      // The theme is applied by the main process either way; only the header's choice would be out of date.
    }
  }
  /** Runs a profile change: shows why it failed, or a short notice when it worked. */
  const profileChange = async (run: () => Promise<void>, done?: string): Promise<boolean> => {
    try {
      await run()
      if (done) get().notify(done)
      return true
    } catch (e) {
      set({ error: cleanError(e) })
      return false
    }
  }
  return {
    pendingFile: null,
    loading: false,
    doc: null,
    lastStep: null,
    rememberStep(address) {
      if (get().doc && get().lastStep !== address) set({ lastStep: address })
    },
    selected: [],
    config: null,
    appInfo: null,
    error: null,

    async init() {
      // React's StrictMode runs effects twice in development: listen only once.
      if (listening) return get().retryStartup()
      listening = true
      window.api.onJobProgress((kind, progress) => {
        // The content check runs alongside the screen, not as the main job.
        if (kind === 'check') {
          if (get().check.status === 'running') set({ check: { ...get().check, progress } })
          return
        }
        // Ignore late updates from a job that already finished or was cancelled.
        if (get().job?.kind === kind) set({ job: { kind, progress } })
      })
      await get().retryStartup()
    },

    startup: { status: 'loading', error: null },
    async retryStartup() {
      set({ startup: { status: 'loading', error: null } })
      try {
        const [config, appInfo] = await Promise.all([window.api.loadConfig(), window.api.getAppInfo()])
        set({ config, appInfo, startup: { status: 'ready', error: null } })
      } catch (e) {
        set({ startup: { status: 'failed', error: cleanError(e) } })
        return
      }
      // Conveniences: the window works without them, so they don't hold up start-up or fail it.
      await Promise.all([
        get().loadActivity(),
        get().loadFavorites(),
        get().loadProfiles(),
        get().loadTemplates(),
        loadTheme()
      ])
    },

    theme: 'system',
    async setTheme(theme) {
      const previous = get().theme
      set({ theme })
      try {
        await window.api.setTheme(theme)
      } catch (e) {
        set({ theme: previous, error: 'Could not change the theme. ' + cleanError(e) })
      }
    },

    activity: [],
    async loadActivity() {
      try {
        set({ activity: await window.api.getActivity() })
      } catch {
        // Recent activity is a convenience: keep what is shown rather than interrupt with an error.
      }
    },
    async clearActivity() {
      try {
        await window.api.clearActivity()
        set({ activity: [] })
        get().notify('Recent activity cleared')
      } catch (e) {
        set({ error: 'Could not clear recent activity. ' + cleanError(e) })
      }
    },

    favorites: [],
    async loadFavorites() {
      try {
        set({ favorites: await window.api.getFavorites() })
      } catch {
        // Favorites are a convenience: keep what is shown.
      }
    },
    async toggleFavorite(fileName, folder) {
      try {
        set({ favorites: await window.api.toggleFavorite(fileName, folder) })
      } catch (e) {
        set({ error: 'Could not change Favorites. ' + cleanError(e) })
      }
    },

    async openFile(file) {
      set({ pendingFile: file, loading: true, error: null, job: { kind: 'load', progress: { stage: 'reading' } } })
      try {
        const doc = await window.api.openDocument(file.path)
        // Pre-select visible sections that contain HTML (or every section, if a template says so).
        const selected = doc.sections
          .filter((s) => get().sheetRule === 'all' || (s.scan.htmlCells > 0 && s.state === 'visible'))
          .map((s) => s.name)
        set({ ...closedDocument, doc, selected })
        void get().loadActivity()
        return true
      } catch (e) {
        // Starting a new load closes the previous file in the background, so start from scratch.
        if (cleanError(e) === CANCELLED_MESSAGE) {
          set(closedDocument)
          get().notify(`Stopped opening ${file.name}`)
        } else {
          set({ ...closedDocument, error: `Could not open ${file.name}. ${cleanError(e)}` })
        }
        return false
      } finally {
        set({ loading: false, pendingFile: null, job: null })
      }
    },

    async browseForFile(startIn) {
      if (get().loading) return false
      try {
        const file = await window.api.openFileDialog(startIn)
        return file ? await get().openFile(file) : false
      } catch (e) {
        set({ error: cleanError(e) })
        return false
      }
    },

    async openDroppedFile(dropped) {
      if (get().loading) return false
      try {
        return await get().openFile(await window.api.describeDroppedFile(dropped))
      } catch (e) {
        set({ error: cleanError(e) })
        return false
      }
    },

    async openSample() {
      if (get().loading) return false
      try {
        const file = await window.api.openSample()
        if (!file) {
          set({ error: 'This app has no sample file.' })
          return false
        }
        return await get().openFile(file)
      } catch (e) {
        set({ error: 'Could not open the sample. ' + cleanError(e) })
        return false
      }
    },

    closeFile() {
      if (!get().loading) set(closedDocument)
    },

    job: null,
    cancelJob() {
      const job = get().job
      if (job) void window.api.cancelJob(job.kind)
    },

    toggleSection(name) {
      const { doc, selected } = get()
      if (!doc) return
      const wanted = new Set(selected)
      if (wanted.has(name)) wanted.delete(name)
      else wanted.add(name)
      set({ selected: doc.sections.map((s) => s.name).filter((n) => wanted.has(n)) })
    },

    selectAllSections(all) {
      const { doc } = get()
      set({ selected: all && doc ? doc.sections.map((s) => s.name) : [] })
    },

    setError(error) {
      set({ error })
    },

    notice: null,
    notify(message) {
      clearTimeout(noticeTimer)
      set({ notice: message })
      noticeTimer = setTimeout(() => set({ notice: null }), 3000)
    },

    profiles: [],
    async loadProfiles() {
      try {
        set({ profiles: await window.api.getProfiles() })
      } catch {
        // The list is only shown on Formatting Profiles; the active styles are already loaded.
      }
    },
    async createProfile(name, copyFrom) {
      return profileChange(
        async () => set({ profiles: await window.api.createProfile(name, copyFrom) }),
        `Created ${name.trim()}`
      )
    },
    async renameProfile(from, to) {
      return profileChange(async () => {
        set({ profiles: await window.api.renameProfile(from, to) })
        const config = get().config
        if (config && config.profileName === from) set({ config: { ...config, profileName: to.trim() } })
      })
    },
    async deleteProfile(name) {
      return profileChange(async () => set({ profiles: await window.api.deleteProfile(name) }), `Deleted ${name}`)
    },
    async activateProfile(name) {
      return profileChange(async () => {
        set({ config: await window.api.activateProfile(name) })
        await get().loadProfiles()
      }, `Using ${name}`)
    },

    templates: [],
    async loadTemplates() {
      try {
        set({ templates: await window.api.getTemplates() })
      } catch {
        // A convenience: keep what is shown.
      }
    },
    async saveTemplate(template) {
      return profileChange(
        async () => set({ templates: await window.api.saveTemplate(template) }),
        `Saved ${template.name}`
      )
    },
    async deleteTemplate(name) {
      return profileChange(async () => set({ templates: await window.api.deleteTemplate(name) }), `Deleted ${name}`)
    },
    async startTemplate(template, appFormatId) {
      const action = actionOf(template.action)
      if (!action || availabilityOf(action, appFormatId) !== 'ready') {
        set({ error: `"${template.name}" uses an action this app can't run yet.` })
        return false
      }
      if (get().config?.profileName !== template.profile && !(await get().activateProfile(template.profile)))
        return false
      get().startWorkflow()
      set({ homeType: action.sourceType, homeAction: action.id, sheetRule: template.sheets })
      return true
    },
    sheetRule: 'html',

    updateRule(tag, patch) {
      const config = get().config
      if (!config) return
      // A tag with no rule yet starts from its built-in look (if it has one), so a change only changes one thing.
      const current = Object.hasOwn(config.rules, tag) ? config.rules[tag] : builtinStyle(tag)
      const rule = cleanStyle({ ...current, ...patch })
      saveConfig({ ...config, rules: { ...config.rules, [tag]: rule } })
    },

    createPlainRule(tag) {
      const config = get().config
      if (config && !Object.hasOwn(config.rules, tag)) saveConfig({ ...config, rules: { ...config.rules, [tag]: {} } })
    },

    removeRule(tag) {
      const config = get().config
      if (!config || !Object.hasOwn(config.rules, tag)) return
      const rules = { ...config.rules }
      delete rules[tag]
      saveConfig({ ...config, rules })
    },

    setUnknownTagAction(unknownTagAction) {
      const config = get().config
      if (config) saveConfig({ ...config, unknownTagAction })
    },

    resetConfig() {
      saveConfig(defaultConfig())
      get().notify('Tag styles reset to the defaults')
    },

    async importConfig() {
      try {
        const config = await window.api.importConfig()
        if (!config) return
        set({ config }) // already saved by the main process
        get().notify(`Imported ${Object.keys(config.rules).length} tag rules`)
      } catch (e) {
        set({ error: 'Could not import tag styles. ' + cleanError(e) })
      }
    },

    async exportConfig() {
      const config = get().config
      if (!config) return
      try {
        const name = await window.api.exportConfig(config)
        if (name) get().notify(`Exported tag styles to ${name}`)
      } catch (e) {
        set({ error: 'Could not export tag styles. ' + cleanError(e) })
      }
    },

    previews: {},
    async loadPreview(section) {
      const { doc, previews } = get()
      if (!doc || previews[section]) return
      try {
        const preview = await window.api.getSectionPreview(doc.file.path, section)
        // Ignore the answer if another file was opened meanwhile.
        if (get().doc === doc) set({ previews: { ...get().previews, [section]: preview } })
      } catch (e) {
        set({ error: `Could not show ${section}. ${cleanError(e)}` })
      }
    },

    exporting: false,
    exportResult: null,
    async exportDocument(acceptIssues = false) {
      const { doc, selected, config, exporting } = get()
      if (!doc || !config || exporting || selected.length === 0) return 'failed'
      set({ exporting: true, error: null, exportResult: null })
      try {
        const report = get().isCheckCurrent() ? get().check.report : await get().runCheck()
        if (!report) return 'failed' // the check's error is shown on the screen
        if (report.issues > 0 && !acceptIssues) return 'review'
        // The job starts once the Save dialog closes; its first progress update shows the bar.
        set({ job: { kind: 'export', progress: null } })
        const outputName = get().outputName.trim()
        const result = await window.api.exportDocument(doc.file.path, selected, config, outputName || undefined)
        if (!result) return 'cancelled'
        void get().loadActivity()
        const clean =
          result.stats.check.issues === 0 && (result.verification === null || result.verification.differences === 0)
        if (clean) {
          set({ ...closedDocument, workflowActive: false, lastSaved: result, lastSavedSource: doc.file.name })
          return 'completed'
        }
        set({ exportResult: result })
        return 'saved'
      } catch (e) {
        if (cleanError(e) === CANCELLED_MESSAGE) {
          get().notify('Saving stopped. No file was written.')
          return 'cancelled'
        }
        set({ error: cleanError(e) })
        return 'failed'
      } finally {
        set({ exporting: false, job: null })
      }
    },

    showInFolder() {
      const result = get().exportResult ?? get().lastSaved
      if (result) window.api.showInFolder(result.path)
    },

    async openSavedFile() {
      const result = get().exportResult ?? get().lastSaved
      if (!result) return
      try {
        await window.api.openSavedFile(result.path)
      } catch (e) {
        set({ error: `Could not open ${result.fileName}. ${cleanError(e)}` })
      }
    },

    outputName: '',
    setOutputName(outputName) {
      set({ outputName })
    },
    lastSavedSource: null,

    dismissExportResult() {
      set({ exportResult: null })
    },

    homeType: 'excel',
    homeAction: 'format-html',
    setHomeType(type, appFormatId) {
      const current = actionOf(get().homeAction)
      const keep = current?.sourceType === type && availabilityOf(current, appFormatId) === 'ready'
      set({ homeType: type, homeAction: keep ? current.id : (firstReadyAction(type, appFormatId)?.id ?? null) })
    },
    setHomeAction(actionId) {
      set({ homeAction: actionId })
    },
    workflowActive: false,
    startWorkflow() {
      set({ workflowActive: true, lastSaved: null, sheetRule: 'html' })
    },
    lastSaved: null,
    dismissLastSaved() {
      set({ lastSaved: null })
    },

    check: idleCheck,
    isCheckCurrent() {
      const { check } = get()
      return check.status === 'done' && check.key !== null && check.key === checkKey(get())
    },

    runCheck() {
      const { doc, selected, config } = get()
      const key = checkKey(get())
      if (!doc || !config || !key || selected.length === 0) return Promise.resolve(null)
      if (runningCheck?.key === key) return runningCheck.promise
      set({ check: { status: 'running', report: null, progress: null, error: null, key } })
      const promise = window.api
        .checkDocument(doc.file.path, selected, config)
        .then((report) => {
          if (checkKey(get()) === key) set({ check: { status: 'done', report, progress: null, error: null, key } })
          return report
        })
        .catch((e) => {
          const error = `The content check did not finish. ${cleanError(e)}`
          if (checkKey(get()) === key) set({ check: { status: 'failed', report: null, progress: null, error, key } })
          return null
        })
        .finally(() => {
          if (runningCheck?.promise === promise) runningCheck = null
        })
      runningCheck = { key, promise }
      return promise
    },

    async exportReport(items) {
      try {
        const name = await window.api.exportReport(reportToCsv(items))
        if (name) get().notify(`Saved the report as ${name}`)
      } catch (e) {
        set({ error: 'Could not save the report. ' + cleanError(e) })
      }
    }
  }
})

function saveConfig(config: AppConfig) {
  useApp.setState({ config })
  persist(config, (error) => useApp.setState({ error }))
}
