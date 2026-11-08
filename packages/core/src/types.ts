import type { TagScan } from './scanTags'

/** Formatting applied to the text inside one HTML tag. */
export interface TagStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  /** Hex color, e.g. "#C00000" */
  color?: string
  /** Font size in points */
  size?: number
  /** Font family, e.g. "Calibri" */
  font?: string
  vertAlign?: 'superscript' | 'subscript'
}

/** What to do with a tag that has no rule. */
export type UnknownTagAction = 'strip' | 'keep'

export interface AppConfig {
  profileName: string
  unknownTagAction: UnknownTagAction
  rules: Record<string, TagStyle>
}

/** A file the user picked in the Open dialog or dropped on the window. */
export interface PickedFile {
  path: string
  name: string
  sizeBytes: number
}

/**
 * One part of a document that can be selected and converted on its own:
 * a sheet in a workbook, a section in a Word document, the whole text of a .txt file…
 */
export interface SectionSummary {
  name: string
  /** 'visible' | 'hidden' | 'veryHidden' (formats without hidden parts always use 'visible') */
  state: string
  /** Short size description chosen by the format, e.g. "6 × 6" for a sheet */
  sizeLabel: string
  /** Which tags the section uses (only text is scanned, never formulas, numbers or links) */
  scan: TagScan
}

export interface DocumentSummary {
  file: PickedFile
  sections: SectionSummary[]
}

export interface ExportStats {
  sections: { name: string; converted: number }[]
  /** Text items (cells, paragraphs…) whose HTML was turned into formatting */
  converted: number
  /** Items that now contain line breaks (Excel: cells set to wrap text) */
  withLineBreaks: number
  /** Tags that had no style and were removed or kept as text */
  unknownTags: string[]
}

export interface ExportResult {
  path: string
  fileName: string
  stats: ExportStats
}

/** Long-running work: opening a file ('load') or saving the formatted copy ('export'). */
export type JobKind = 'load' | 'export'

export interface JobProgress {
  stage: 'reading' | 'scanning' | 'converting' | 'saving'
  /** Set when the amount of work is known (sections scanned, rows converted). */
  done?: number
  total?: number
  /** e.g. the section being worked on */
  detail?: string
  /** What `done`/`total` count, e.g. "rows" (defaults to the section name, plural) */
  unit?: string
}

export interface AppInfo {
  version: string
  platform: string
  configPath: string
}

/**
 * The API the preload script exposes to the UI as `window.api`. The same for every format;
 * only the preview data is format-specific (`unknown` here, typed by each app).
 */
export interface ElectronApi {
  /** Shows the Open dialog. Resolves to null if the user cancels. */
  openFileDialog(): Promise<PickedFile | null>
  /** For drag-and-drop: turns a dropped File into a PickedFile (rejects unsupported file types). */
  describeDroppedFile(file: File): Promise<PickedFile>
  /** Reads a file picked above and scans every section for HTML tags. */
  openDocument(path: string): Promise<DocumentSummary>
  /** Preview data for one section of the open document (shape depends on the format). */
  getSectionPreview(path: string, section: string): Promise<unknown>
  /**
   * Shows a Save dialog, converts the chosen sections of a fresh copy of the file, and writes it.
   * The original file is never changed. Resolves to null if the user cancels.
   */
  exportDocument(path: string, sections: string[], config: AppConfig): Promise<ExportResult | null>
  /** Opens the folder of a file this app just saved, with the file selected. */
  showInFolder(path: string): Promise<void>
  /** Stops a running load or export. The pending call then rejects with CANCELLED_MESSAGE. */
  cancelJob(kind: JobKind): Promise<void>
  /** Progress of running jobs. Returns a function that stops listening. */
  onJobProgress(listener: (kind: JobKind, progress: JobProgress) => void): () => void
  loadConfig(): Promise<AppConfig>
  saveConfig(config: AppConfig): Promise<void>
  /** Shows a Save dialog and writes the config as JSON. Resolves to the file name, or null if cancelled. */
  exportConfig(config: AppConfig): Promise<string | null>
  /** Shows an Open dialog, validates the JSON and makes it the current config. Null if cancelled. */
  importConfig(): Promise<AppConfig | null>
  getAppInfo(): Promise<AppInfo>
}

/** The error message a cancelled job rejects with (not shown to the user as an error). */
export const CANCELLED_MESSAGE = 'Cancelled by the user.'
