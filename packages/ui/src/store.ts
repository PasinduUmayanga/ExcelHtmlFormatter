/// <reference path="./env.d.ts" />
/// <reference path="./css.d.ts" />
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
  type JobKind,
  type JobProgress,
  type PickedFile,
  type TagStyle,
  type UnknownTagAction
} from '@hf/core'

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

  init(): Promise<void>
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
  /** Opens a file dropped on the window. False when busy or it failed. */
  openDroppedFile(file: File): Promise<boolean>
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
   * ("Save anyway", decision E7).
   */
  exportDocument(acceptIssues?: boolean): Promise<'saved' | 'review' | 'cancelled' | 'failed'>
  showInFolder(): void
  dismissExportResult(): void

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
  state: Pick<AppState, 'doc' | 'loading' | 'selected'>,
  screen: 'sections' | 'analysis' | 'preview'
): boolean {
  if (state.loading || !state.doc) return false
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

const closedDocument = { doc: null, lastStep: null, selected: [], previews: {}, exportResult: null, check: idleCheck }

export const useApp = create<AppState>((set, get) => {
  /** Shows the saved theme in the header (main already applied it before the window opened). */
  const loadTheme = async () => {
    try {
      set({ theme: (await window.api.getPreferences()).theme })
    } catch {
      // The theme is applied by the main process either way; only the header's choice would be out of date.
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
      window.api.onJobProgress((kind, progress) => {
        // The content check runs alongside the screen, not as the main job.
        if (kind === 'check') {
          if (get().check.status === 'running') set({ check: { ...get().check, progress } })
          return
        }
        // Ignore late updates from a job that already finished or was cancelled.
        if (get().job?.kind === kind) set({ job: { kind, progress } })
      })
      try {
        const [config, appInfo] = await Promise.all([window.api.loadConfig(), window.api.getAppInfo()])
        set({ config, appInfo })
      } catch (e) {
        set({ error: 'Could not load settings: ' + cleanError(e) })
      }
      await Promise.all([get().loadActivity(), loadTheme()])
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

    async openFile(file) {
      set({ pendingFile: file, loading: true, error: null, job: { kind: 'load', progress: { stage: 'reading' } } })
      try {
        const doc = await window.api.openDocument(file.path)
        // Pre-select visible sections that contain HTML.
        const selected = doc.sections.filter((s) => s.scan.htmlCells > 0 && s.state === 'visible').map((s) => s.name)
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
        const result = await window.api.exportDocument(doc.file.path, selected, config)
        if (!result) return 'cancelled'
        set({ exportResult: result })
        void get().loadActivity()
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
      const result = get().exportResult
      if (result) window.api.showInFolder(result.path)
    },

    dismissExportResult() {
      set({ exportResult: null })
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
