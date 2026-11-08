import ExcelJS from 'exceljs'
import { rename, rm } from 'node:fs/promises'
import {
  hasHtml,
  htmlToRuns,
  scanCells,
  throttle,
  type CellText,
  type ConvertOptions,
  type DocumentSummary,
  type ExportStats,
  type PickedFile,
  type ProgressCallback
} from '@hf/core'
import { toExcelRichText, type ExcelFont } from './excelRichText'
import type { PreviewCell, SheetPreview } from './format'

/* ---------- Preview ---------- */

export const PREVIEW_ROWS = 200
export const PREVIEW_COLS = 30

/** How a non-text cell looks, for the preview grid. */
export function displayValue(cell: ExcelJS.Cell): string {
  const v = cell.value
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    if ('formula' in v || 'sharedFormula' in v) {
      const result = (v as ExcelJS.CellFormulaValue).result
      if (result instanceof Date) return result.toISOString().slice(0, 10)
      if (result && typeof result === 'object' && 'error' in result) return String(result.error)
      return result === undefined || result === null ? '' : String(result)
    }
    if ('hyperlink' in v) return String((v as ExcelJS.CellHyperlinkValue).text ?? '')
    if ('error' in v) return String((v as ExcelJS.CellErrorValue).error)
  }
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  return String(v)
}

/** The top-left part of a sheet (at most PREVIEW_ROWS × PREVIEW_COLS) for the preview grid. */
export function sheetPreview(sheet: ExcelJS.Worksheet): SheetPreview {
  const rowCount = sheet.rowCount
  const columnCount = sheet.columnCount
  const maxRows = Math.min(rowCount, PREVIEW_ROWS)
  const maxCols = Math.min(columnCount, PREVIEW_COLS)
  const rows: (PreviewCell | null)[][] = []
  for (let r = 1; r <= maxRows; r++) {
    const row = sheet.findRow(r)
    const cells: (PreviewCell | null)[] = []
    for (let c = 1; c <= maxCols; c++) {
      const cell = row?.findCell(c)
      if (!cell || cell.type === ExcelJS.ValueType.Merge || cell.type === ExcelJS.ValueType.Null) {
        cells.push(null)
        continue
      }
      const text = cellText(cell)
      cells.push(text !== null ? (hasHtml(text) ? { text, html: true } : { text }) : { text: displayValue(cell) })
    }
    rows.push(cells)
  }
  return { sheet: sheet.name, rows, rowCount, columnCount, truncated: rowCount > maxRows || columnCount > maxCols }
}

/* ---------- Conversion ---------- */

/** The cell's own font, so formatted runs keep it (Excel would otherwise fall back to the default font). */
export function baseFont(cell: ExcelJS.Cell): ExcelFont {
  const f: Partial<ExcelJS.Font> = cell.font ?? {}
  const base: ExcelFont = {}
  if (f.name) base.name = f.name
  if (f.size) base.size = f.size
  if (f.family) base.family = f.family
  if (f.scheme && f.scheme !== 'none') base.scheme = f.scheme
  if (f.charset) base.charset = f.charset
  if (f.bold) base.bold = true
  if (f.italic) base.italic = true
  if (f.strike) base.strike = true
  if (f.underline && f.underline !== 'none') base.underline = f.underline
  if (f.vertAlign) base.vertAlign = f.vertAlign
  if (f.color && (f.color.argb || f.color.theme !== undefined)) {
    base.color = {}
    if (f.color.argb) base.color.argb = f.color.argb
    if (f.color.theme !== undefined) base.color.theme = f.color.theme
    const tint = (f.color as { tint?: number }).tint
    if (tint !== undefined) base.color.tint = tint
  }
  return base
}

/**
 * Replaces the HTML in one cell with rich text. Returns null if the cell was left alone,
 * otherwise whether it now needs "wrap text" and which tags had no rule.
 */
export function convertCell(
  cell: ExcelJS.Cell,
  options: ConvertOptions
): { wrapped: boolean; unknownTags: string[] } | null {
  const text = cellText(cell)
  if (text === null || !hasHtml(text)) return null
  const result = htmlToRuns(text, options)
  if (result.plainText === '') {
    cell.value = null // e.g. "<b></b>": nothing left to show
  } else {
    cell.value = toExcelRichText(result.runs, baseFont(cell)) as ExcelJS.CellRichTextValue
  }
  if (result.hasLineBreak) cell.alignment = { ...cell.alignment, wrapText: true }
  return { wrapped: result.hasLineBreak, unknownTags: result.unknownTags }
}

/** Converts every HTML cell in the chosen sheets. Other sheets and non-text cells are not touched. */
export function convertWorkbook(
  workbook: ExcelJS.Workbook,
  sheetNames: string[],
  options: ConvertOptions,
  onProgress?: ProgressCallback
): ExportStats {
  const wanted = new Set(sheetNames)
  const unknown = new Set<string>()
  const stats: ExportStats = { sections: [], converted: 0, withLineBreaks: 0, unknownTags: [] }
  const sheets = workbook.worksheets.filter((s) => wanted.has(s.name))
  const totalRows = sheets.reduce((sum, s) => sum + s.rowCount, 0)
  let rowsDone = 0
  const report = throttle(onProgress)
  for (const sheet of sheets) {
    let cells = 0
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      report({ stage: 'converting', done: rowsDone + rowNumber, total: totalRows, unit: 'rows', detail: sheet.name })
      row.eachCell({ includeEmpty: false }, (cell) => {
        const done = convertCell(cell, options)
        if (!done) return
        cells++
        if (done.wrapped) stats.withLineBreaks++
        done.unknownTags.forEach((t) => unknown.add(t))
      })
    })
    stats.sections.push({ name: sheet.name, converted: cells })
    stats.converted += cells
    rowsDone += sheet.rowCount
  }
  report({ stage: 'converting', done: totalRows, total: totalRows, unit: 'rows' }, true)
  stats.unknownTags = [...unknown].sort()
  return stats
}

/** Writes to a temporary file, then renames it, so a failed save never leaves a broken .xlsx behind. */
export async function writeWorkbookSafely(workbook: ExcelJS.Workbook, path: string): Promise<void> {
  const tmp = `${path}.saving`
  try {
    await workbook.xlsx.writeFile(tmp)
    await rename(tmp, path)
  } catch (e) {
    await rm(tmp, { force: true }).catch(() => {})
    const code = (e as NodeJS.ErrnoException).code
    if (code === 'EBUSY' || code === 'EPERM' || code === 'EACCES') {
      throw new Error(
        'The file could not be saved. If it is open in Excel, close it and try again, or choose another name.',
        { cause: e }
      )
    }
    throw new Error('The file could not be saved: ' + (e as Error).message, { cause: e })
  }
}

/**
 * The text of a cell that may contain HTML, or null if the cell must not be converted.
 * Only plain text and existing rich text are used. Formulas, numbers, dates, hyperlinks
 * and the hidden "slave" cells of a merged range are always left alone.
 */
export function cellText(cell: ExcelJS.Cell): string | null {
  if (cell.type === ExcelJS.ValueType.Merge) return null
  const value = cell.value
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'richText' in value) {
    return value.richText.map((part) => part.text).join('')
  }
  return null
}

/** All text cells of a sheet, with their addresses. */
export function sheetCells(sheet: ExcelJS.Worksheet): CellText[] {
  const cells: CellText[] = []
  sheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      const text = cellText(cell)
      if (text) cells.push({ address: cell.address, text })
    })
  })
  return cells
}

export function summarizeWorkbook(
  workbook: ExcelJS.Workbook,
  file: PickedFile,
  onProgress?: ProgressCallback
): DocumentSummary {
  const total = workbook.worksheets.length
  return {
    file,
    sections: workbook.worksheets.map((sheet, i) => {
      onProgress?.({ stage: 'scanning', done: i, total, unit: 'sheets', detail: sheet.name })
      return {
        name: sheet.name,
        state: sheet.state ?? 'visible',
        sizeLabel: `${sheet.rowCount.toLocaleString()} × ${sheet.columnCount.toLocaleString()}`,
        scan: scanCells(sheetCells(sheet))
      }
    })
  }
}

export async function readWorkbook(path: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.readFile(path)
  } catch (e) {
    throw new Error(friendlyReadError(e), { cause: e })
  }
  return workbook
}

/** Turns low-level read errors into a message the user can act on. */
export function friendlyReadError(error: unknown): string {
  const err = error as NodeJS.ErrnoException
  // ExcelJS reports a missing file as a plain Error("File not found: <path>").
  if (/^File not found/i.test(err?.message ?? '')) return friendlyReadError({ code: 'ENOENT' })
  switch (err?.code) {
    case 'ENOENT':
      return 'The file could not be found. It may have been moved or deleted.'
    case 'EACCES':
    case 'EPERM':
    case 'EBUSY':
      return 'The file could not be opened. Close it in Excel (or any other program) and try again.'
  }
  return (
    'This file could not be read as an Excel workbook. It may be damaged, password-protected, ' +
    'or an older .xls file renamed to .xlsx. Open it in Excel and save it again as .xlsx.'
  )
}
