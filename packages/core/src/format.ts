/**
 * Everything the shared desktop shell and UI need to know about one file format:
 * names, file types and the words used on screen. Each app provides one.
 * Plain data only, so it is safe to import in both the main process and the window.
 */
export interface FormatInfo {
  /** Short id, e.g. "excel" */
  id: string
  /** Shown in the window title and sidebar, e.g. "FormaFlow" */
  appName: string
  /** Optional short description under the name in the sidebar, e.g. "HTML → Excel formatting" */
  tagline?: string
  /** File types for the Open dialog and drag-and-drop */
  fileTypes: { name: string; extensions: string[] }[]
  /** Added to the original name when saving, e.g. "_formatted" -> "report_formatted.xlsx" */
  outputSuffix: string
  /** Extension of the saved file, e.g. "xlsx" */
  outputExtension: string
  /** Words for the parts of a document, e.g. sheet / sheets */
  section: { singular: string; plural: string }
  /** Words for the text items that get formatted, e.g. cell / cells */
  unit: { singular: string; plural: string }
  /** Screen texts */
  text: {
    openTitle: string
    openHint: string
    dropHint: string
    /** e.g. "set to wrap text" for Excel; shown after the number of items with line breaks */
    lineBreakNote: string
    /** Shown next to the Save button, e.g. what the format cannot keep */
    saveNote: string
  }
}

/** "sheets" -> "Sheets" */
export const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

/** "1 sheet", "3 sheets" */
export const count = (n: number, words: { singular: string; plural: string }) =>
  `${n.toLocaleString()} ${n === 1 ? words.singular : words.plural}`
