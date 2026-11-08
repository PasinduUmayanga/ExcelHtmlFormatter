/// <reference path="./env.d.ts" />
/// <reference path="./css.d.ts" />
import { create } from 'zustand'
import {
  CANCELLED_MESSAGE, cleanStyle, defaultConfig,
  type AppConfig, type AppInfo, type DocumentSummary, type ExportResult, type JobKind, type JobProgress,
  type PickedFile, type TagStyle, type UnknownTagAction
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
  /** Names of the sections the user ticked, in document order. */
  selected: string[]
  config: AppConfig | null
  appInfo: AppInfo | null
  error: string | null

  init(): Promise<void>
  /** Opens a file. Resolves to true when it is ready to show. */
  openFile(file: PickedFile): Promise<boolean>
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
  exportDocument(): Promise<void>
  showInFolder(): void
  dismissExportResult(): void
}

/** Which screens can be visited right now (used by route guards and the sidebar). */
export function canVisit(state: Pick<AppState, 'doc' | 'loading' | 'selected'>, screen: 'sections' | 'analysis' | 'preview'): boolean {
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

const closedDocument = { doc: null, selected: [], previews: {}, exportResult: null }

export const useApp = create<AppState>((set, get) => ({
  pendingFile: null,
  loading: false,
  doc: null,
  selected: [],
  config: null,
  appInfo: null,
  error: null,

  async init() {
    window.api.onJobProgress((kind, progress) => {
      // Ignore late updates from a job that already finished or was cancelled.
      if (get().job?.kind === kind) set({ job: { kind, progress } })
    })
    try {
      const [config, appInfo] = await Promise.all([window.api.loadConfig(), window.api.getAppInfo()])
      set({ config, appInfo })
    } catch (e) {
      set({ error: 'Could not load settings: ' + cleanError(e) })
    }
  },

  async openFile(file) {
    set({ pendingFile: file, loading: true, error: null, job: { kind: 'load', progress: { stage: 'reading' } } })
    try {
      const doc = await window.api.openDocument(file.path)
      // Pre-select visible sections that contain HTML.
      const selected = doc.sections.filter((s) => s.scan.htmlCells > 0 && s.state === 'visible').map((s) => s.name)
      set({ ...closedDocument, doc, selected })
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
    const rule = cleanStyle({ ...config.rules[tag], ...patch })
    saveConfig({ ...config, rules: { ...config.rules, [tag]: rule } })
  },

  createPlainRule(tag) {
    const config = get().config
    if (config && !config.rules[tag]) saveConfig({ ...config, rules: { ...config.rules, [tag]: {} } })
  },

  removeRule(tag) {
    const config = get().config
    if (!config?.rules[tag]) return
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
  async exportDocument() {
    const { doc, selected, config, exporting } = get()
    if (!doc || !config || exporting || selected.length === 0) return
    set({ exporting: true, error: null, exportResult: null })
    try {
      // The job starts once the Save dialog closes; its first progress update shows the bar.
      set({ job: { kind: 'export', progress: null } })
      const result = await window.api.exportDocument(doc.file.path, selected, config)
      if (result) set({ exportResult: result })
    } catch (e) {
      if (cleanError(e) === CANCELLED_MESSAGE) get().notify('Saving stopped. No file was written.')
      else set({ error: cleanError(e) })
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
  }
}))

function saveConfig(config: AppConfig) {
  useApp.setState({ config })
  persist(config, (error) => useApp.setState({ error }))
}
