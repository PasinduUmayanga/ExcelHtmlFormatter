// Browser-safe part of the Excel adapter: format details and preview types.
// The window imports this; it must never import ExcelJS or Node modules.
import type { FormatInfo } from '@hf/core'

export const excelFormat: FormatInfo = {
  id: 'excel',
  appName: 'FormaFlow',
  tagline: 'Document Processing Suite',
  fileTypes: [{ name: 'Excel workbook', extensions: ['xlsx'] }],
  outputSuffix: '_formatted',
  outputExtension: 'xlsx',
  section: { singular: 'sheet', plural: 'sheets' },
  unit: { singular: 'cell', plural: 'cells' },
  text: {
    openTitle: 'Open an Excel file',
    openHint: 'Choose a workbook whose cells contain HTML tags such as <b> and <i>.',
    dropHint: 'Drop an .xlsx file here, or click to browse',
    lineBreakNote: 'set to wrap text',
    saveNote: 'Saved as a new file. Charts, pivot tables and macros in the original are not copied.'
  }
}

/** One cell in the preview grid. `html` is set when the cell will be converted. */
export interface PreviewCell {
  text: string
  html?: boolean
}

/** What the Excel preview screen shows for one sheet. */
export interface SheetPreview {
  sheet: string
  /** Top-left part of the sheet; null = empty cell */
  rows: (PreviewCell | null)[][]
  rowCount: number
  columnCount: number
  /** True if the sheet is larger than the preview */
  truncated: boolean
}
