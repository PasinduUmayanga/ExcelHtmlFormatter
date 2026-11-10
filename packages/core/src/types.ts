import type { TagScan } from './scanTags'
import type { ContentReport, SaveVerification } from './verify/report'

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
  /** Settings format version (SETTINGS_VERSION). Missing means version 1 (before F2). */
  version?: number
  profileName: string
  unknownTagAction: UnknownTagAction
  rules: Record<string, TagStyle>
}

/** A saved setup to start a task with (Templates, ADR 0018). */
export interface WorkflowTemplate {
  name: string
  /** File type id on Home (e.g. "excel") */
  fileType: string
  /** Action id on Home (e.g. "format-html") */
  action: string
  /** Formatting profile to use */
  profile: string
  /** Which sections are ticked when the file opens: those with HTML, or all */
  sheets: 'html' | 'all'
}

/** One formatting profile in the list (ADR 0018); the active one's styles are the AppConfig. */
export interface ProfileSummary {
  name: string
  ruleCount: number
  active: boolean
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
  /** Items that became links (the first safe <a href> in each) */
  linksAdded: number
  /** Links not added: unsafe or invalid addresses, or a second link in the same item */
  linksSkipped: number
  /** Items highlighted as a whole (all their text was in <mark> or had a background colour) */
  highlighted: number
  /** The content proof of every converted item (checks A and D) */
  check: ContentReport
}

export interface ExportResult {
  path: string
  fileName: string
  stats: ExportStats
  /** The saved file re-read and compared (checks B and C); null if the user skipped it with Cancel */
  verification: SaveVerification | null
}

/**
 * Long-running work: opening a file ('load'), checking the content before saving ('check'),
 * or saving the formatted copy ('export', which ends with verifying the saved file).
 */
export type JobKind = 'load' | 'check' | 'export'

export interface JobProgress {
  stage: 'reading' | 'scanning' | 'checking' | 'converting' | 'saving' | 'verifying'
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
 * One recent action, for the Home screen's Recent activity. Recorded by the main process only
 * (the window can read and clear the list, never add to it). Stored on this computer.
 */
/** A starred file (Favorites). Opening it shows the Open dialog in its folder. */
export interface FavoriteFile {
  fileName: string
  folder: string
  /** When it was starred (ISO 8601) */
  at: string
}

export interface ActivityEntry {
  kind: 'opened' | 'saved'
  /** The file's name, e.g. "report.xlsx" (for 'saved': the new file) */
  fileName: string
  /** The folder that holds the file */
  folder: string
  /** When it happened (ISO 8601) */
  at: string
  /** 'saved' only: the name of the file it was made from */
  sourceName?: string
  /** 'saved' only: how many items were formatted */
  converted?: number
  /** 'saved' only: the result of checking the saved file (not-checked: the check was stopped) */
  check?: 'verified' | 'differences' | 'not-checked'
  /** 'saved' only: differences found when checking the saved file */
  differences?: number
}

/** Light, dark, or follow the operating system. */
export type ThemeChoice = 'system' | 'light' | 'dark'

/** Window preferences, stored apart from the tag styles (they are not part of an exported style profile). */
export interface Preferences {
  theme: ThemeChoice
}

/**
 * The API the preload script exposes to the UI as `window.api`. The same for every format;
 * only the preview data is format-specific (`unknown` here, typed by each app).
 */
export interface ElectronApi {
  /**
   * Shows the Open dialog. Resolves to null if the user cancels. `startIn` opens the dialog in that folder,
   * but only if it is a folder from the recent activity (anything else is ignored).
   */
  openFileDialog(startIn?: string): Promise<PickedFile | null>
  /** Recent actions, newest first (at most 10). */
  getActivity(): Promise<ActivityEntry[]>
  /** Empties the recent actions list (favourites stay). */
  clearActivity(): Promise<void>
  /** The starred files, newest first (stored on this computer, ADR 0017). */
  getFavorites(): Promise<FavoriteFile[]>
  /** Stars or unstars a file from the recent activity; resolves to the new list. */
  toggleFavorite(fileName: string, folder: string): Promise<FavoriteFile[]>
  /** The saved window preferences (the theme). */
  getPreferences(): Promise<Preferences>
  /** Applies a theme to the whole app (window, dialogs, menus) and saves it. Rejects anything else. */
  setTheme(theme: ThemeChoice): Promise<void>
  /**
   * Picks the sample file that ships with the app, as if the user had chosen it (ADR 0017). Null when this app
   * has no sample.
   */
  openSample(): Promise<PickedFile | null>
  /** For drag-and-drop: turns a dropped File into a PickedFile (rejects unsupported file types). */
  describeDroppedFile(file: File): Promise<PickedFile>
  /** Reads a file picked above and scans every section for HTML tags. */
  openDocument(path: string): Promise<DocumentSummary>
  /** Preview data for one section of the open document (shape depends on the format). */
  getSectionPreview(path: string, section: string): Promise<unknown>
  /**
   * Shows a Save dialog, converts the chosen sections of a fresh copy of the file, and writes it.
   * The original file is never changed. Resolves to null if the user cancels. `suggestedName` is the file name the
   * Save dialog starts with (a name only; folders and characters files can't have are removed, ADR 0017).
   */
  exportDocument(
    path: string,
    sections: string[],
    config: AppConfig,
    suggestedName?: string
  ): Promise<ExportResult | null>
  /**
   * Checks that converting the chosen sections loses no text and fits the format's limits
   * (nothing is written). Uses the document already open; not cancellable (it is quick).
   */
  checkDocument(path: string, sections: string[], config: AppConfig): Promise<ContentReport>
  /** Shows a Save dialog and writes the check report as CSV. Resolves to the file name, or null if cancelled. */
  exportReport(csv: string): Promise<string | null>
  /** Opens the folder of a file this app just saved, with the file selected. */
  showInFolder(path: string): Promise<void>
  /** Opens a file this app just saved in its usual program (ADR 0017, decision R9). Rejects with the reason if it can't. */
  openSavedFile(path: string): Promise<void>
  /**
   * Stops a running load or export. The pending call then rejects with CANCELLED_MESSAGE, except
   * while an export is verifying the saved file: then the file stays saved and `verification` is null.
   */
  cancelJob(kind: JobKind): Promise<void>
  /** Progress of running jobs. Returns a function that stops listening. */
  onJobProgress(listener: (kind: JobKind, progress: JobProgress) => void): () => void
  loadConfig(): Promise<AppConfig>
  /** Saves the active profile's styles (its name stays as it is: rename with renameProfile). */
  saveConfig(config: AppConfig): Promise<void>
  /** Every formatting profile, the active one first (ADR 0018). */
  getProfiles(): Promise<ProfileSummary[]>
  /** A new profile with the default styles, or a copy of `copyFrom`. Not made active. */
  createProfile(name: string, copyFrom: string | null): Promise<ProfileSummary[]>
  renameProfile(from: string, to: string): Promise<ProfileSummary[]>
  /** Deletes a profile that is neither active nor Default. */
  deleteProfile(name: string): Promise<ProfileSummary[]>
  /** Makes a profile active; resolves to its styles (the new AppConfig). */
  activateProfile(name: string): Promise<AppConfig>
  /** Saved setups, by name (ADR 0018). */
  getTemplates(): Promise<WorkflowTemplate[]>
  /** Adds a template, or replaces the one with the same name; resolves to the new list. */
  saveTemplate(template: WorkflowTemplate): Promise<WorkflowTemplate[]>
  deleteTemplate(name: string): Promise<WorkflowTemplate[]>
  /** Shows a Save dialog and writes the config as JSON. Resolves to the file name, or null if cancelled. */
  exportConfig(config: AppConfig): Promise<string | null>
  /** Shows an Open dialog, validates the JSON and makes it the current config. Null if cancelled. */
  importConfig(): Promise<AppConfig | null>
  getAppInfo(): Promise<AppInfo>
}

/** The error message a cancelled job rejects with (not shown to the user as an error). */
export const CANCELLED_MESSAGE = 'Cancelled by the user.'
