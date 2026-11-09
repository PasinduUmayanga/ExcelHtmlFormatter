import ExcelJS from 'exceljs'
import { rename, rm } from 'node:fs/promises'
import {
  emptyReport,
  hasHtml,
  htmlToRuns,
  MAX_REPORT_ITEMS,
  proveContent,
  ReportBuilder,
  scanCells,
  throttle,
  type CellText,
  type CheckItem,
  type ContentReport,
  type ConvertOptions,
  type ConvertResult,
  type DocumentSummary,
  type ExportStats,
  type PickedFile,
  type ProgressCallback,
  type SaveVerification
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

/** Excel's fill for a cell whose whole text is highlighted (Excel can't highlight part of a cell). */
export const HIGHLIGHT_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }

export interface CellConversion {
  /** The cell's text before conversion (the HTML) */
  html: string
  result: ConvertResult
}

/** Converts a cell's HTML without changing the cell. Null if the cell is not converted at all. */
export function planCell(cell: ExcelJS.Cell, options: ConvertOptions): CellConversion | null {
  const html = cellText(cell)
  if (html === null || !hasHtml(html)) return null
  return { html, result: htmlToRuns(html, options) }
}

/**
 * The value written for a converted cell: rich text, wrapped in a hyperlink when the cell has a
 * safe link. ExcelJS's types say a hyperlink's text is a string, but it writes (and reads back)
 * rich text there too; this cast is the only place that relies on it (checked by round-trip tests).
 */
export function convertedValue(result: ConvertResult, base: ExcelFont): ExcelJS.CellValue {
  if (result.plainText === '') return null // e.g. "<b></b>": nothing left to show
  const rich = toExcelRichText(result.runs, base)
  if (!result.cellLink) return rich as ExcelJS.CellRichTextValue
  return { text: rich, hyperlink: result.cellLink } as unknown as ExcelJS.CellHyperlinkValue
}

/**
 * Replaces the HTML in one cell with rich text, plus the cell-level effects: a hyperlink, a
 * highlight fill and "wrap text". Returns null if the cell was left alone.
 */
export function convertCell(cell: ExcelJS.Cell, options: ConvertOptions): CellConversion | null {
  const plan = planCell(cell, options)
  if (!plan) return null
  const { result } = plan
  cell.value = convertedValue(result, baseFont(cell))
  if (result.hasLineBreak) cell.alignment = { ...cell.alignment, wrapText: true }
  if (result.fullyHighlighted) cell.fill = HIGHLIGHT_FILL
  return plan
}

/** Calls `visit` for every cell of the chosen sheets, reporting progress by rows. */
function eachCellOf(
  workbook: ExcelJS.Workbook,
  sheetNames: string[],
  stage: 'checking' | 'converting',
  onProgress: ProgressCallback | undefined,
  visit: (sheet: ExcelJS.Worksheet, cell: ExcelJS.Cell) => void
): ExcelJS.Worksheet[] {
  const wanted = new Set(sheetNames)
  const sheets = workbook.worksheets.filter((s) => wanted.has(s.name))
  const totalRows = sheets.reduce((sum, s) => sum + s.rowCount, 0)
  let rowsDone = 0
  const report = throttle(onProgress)
  for (const sheet of sheets) {
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      report({ stage, done: rowsDone + rowNumber, total: totalRows, unit: 'rows', detail: sheet.name })
      row.eachCell({ includeEmpty: false }, (cell) => visit(sheet, cell))
    })
    rowsDone += sheet.rowCount
  }
  report({ stage, done: totalRows, total: totalRows, unit: 'rows' }, true)
  return sheets
}

/** Converts every HTML cell in the chosen sheets. Other sheets and non-text cells are not touched. */
export function convertWorkbook(
  workbook: ExcelJS.Workbook,
  sheetNames: string[],
  options: ConvertOptions,
  onProgress?: ProgressCallback
): ExportStats {
  const unknown = new Set<string>()
  const counts = new Map<string, number>()
  const proofs = new ReportBuilder()
  const stats: ExportStats = {
    sections: [],
    converted: 0,
    withLineBreaks: 0,
    unknownTags: [],
    linksAdded: 0,
    linksSkipped: 0,
    highlighted: 0,
    check: emptyReport()
  }
  const sheets = eachCellOf(workbook, sheetNames, 'converting', onProgress, (sheet, cell) => {
    const done = convertCell(cell, options)
    if (!done) return
    const { result } = done
    counts.set(sheet.name, (counts.get(sheet.name) ?? 0) + 1)
    if (result.hasLineBreak) stats.withLineBreaks++
    if (result.cellLink && result.plainText) stats.linksAdded++
    stats.linksSkipped += result.skippedLinks.length
    if (result.fullyHighlighted) stats.highlighted++
    result.unknownTags.forEach((t) => unknown.add(t))
    proofs.add(sheet.name, cell.address, done.html, result, proveContent(done.html, result, options))
  })
  for (const sheet of sheets) {
    const converted = counts.get(sheet.name) ?? 0
    stats.sections.push({ name: sheet.name, converted })
    stats.converted += converted
  }
  stats.unknownTags = [...unknown].sort()
  stats.check = proofs.build()
  return stats
}

/** The content proof for the chosen sheets, without changing the workbook (checks A and D). */
export function checkWorkbook(
  workbook: ExcelJS.Workbook,
  sheetNames: string[],
  options: ConvertOptions,
  onProgress?: ProgressCallback
): ContentReport {
  const proofs = new ReportBuilder()
  eachCellOf(workbook, sheetNames, 'checking', onProgress, (sheet, cell) => {
    const plan = planCell(cell, options)
    if (plan)
      proofs.add(sheet.name, cell.address, plan.html, plan.result, proveContent(plan.html, plan.result, options))
  })
  return proofs.build()
}

/* ---------- Checking the saved file ---------- */

interface CellRecord {
  /** The value, serialised so it can be compared after a save and re-read */
  value: string
  /** The cell's text if it could hold HTML (see cellText) */
  text: string | null
  sheet: string
  address: string
  row: number
  col: number
}

/**
 * What `verifyWorkbook` needs: every original cell value (keyed by sheet and address), and the
 * workbook itself, which `convert` then changes in place, so it holds exactly what was written.
 */
export interface WorkbookSnapshot {
  cells: Map<string, CellRecord>
  workbook: ExcelJS.Workbook
}

/** A control character can't appear in a sheet name, so keys never collide. */
const keyOf = (sheet: string, address: string) => `${sheet}\u0001${address}`

/** A stable text form of a cell value. Merged cells record their master cell instead of the shared value. */
export function serializeValue(cell: ExcelJS.Cell): string {
  if (cell.type === ExcelJS.ValueType.Merge) return `merge:${cell.master.address}`
  const value = cell.value
  // Most cells are plain text: a marker character (never produced by JSON) keeps them apart from JSON forms.
  if (typeof value === 'string') return `\u0002${value}`
  return JSON.stringify(value ?? null)
}

export function snapshotWorkbook(workbook: ExcelJS.Workbook): WorkbookSnapshot {
  const cells = new Map<string, CellRecord>()
  for (const sheet of workbook.worksheets) {
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) =>
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (cell.type === ExcelJS.ValueType.Null) return
        cells.set(keyOf(sheet.name, cell.address), {
          value: serializeValue(cell),
          text: cellText(cell),
          sheet: sheet.name,
          address: cell.address,
          row: rowNumber,
          col: colNumber
        })
      })
    )
  }
  return { cells, workbook }
}

/** The text and link of a cell as saved (plain text, rich text, or a hyperlink with either). */
export function savedText(cell: ExcelJS.Cell): { text: string; link?: string } {
  const value = cell.value as unknown
  if (value === null || value === undefined) return { text: '' }
  if (typeof value === 'string') return { text: value }
  if (typeof value === 'object' && 'richText' in value) return { text: richTextOf(value) }
  if (typeof value === 'object' && 'hyperlink' in value) {
    const v = value as { text?: unknown; hyperlink: string }
    const text = typeof v.text === 'string' ? v.text : v.text && typeof v.text === 'object' ? richTextOf(v.text) : ''
    return { text, link: v.hyperlink }
  }
  return { text: displayValue(cell) }
}

function richTextOf(value: object): string {
  const parts = (value as { richText?: unknown }).richText
  return Array.isArray(parts) ? parts.map((p: { text?: unknown }) => String(p.text ?? '')).join('') : ''
}

/**
 * Compares a saved workbook (read back from disk) with the snapshot of the original (checks B and C).
 * Converted cells must hold exactly the text and link that were written (the converted workbook,
 * still in memory); every other cell, in every sheet, must have the same value as before.
 * (Whether the conversion itself lost text is check A, the content proof made while converting.)
 */
export function verifyWorkbook(
  saved: ExcelJS.Workbook,
  snapshot: WorkbookSnapshot,
  sheetNames: string[],
  _options: ConvertOptions,
  onProgress?: ProgressCallback,
  maxItems = MAX_REPORT_ITEMS
): SaveVerification {
  const wanted = new Set(sheetNames)
  const result: SaveVerification = { compared: 0, differences: 0, items: [], truncated: false }
  const seen = new Set<string>()
  const report = throttle(onProgress)
  const { cells } = snapshot
  const total = cells.size
  const add = (item: CheckItem) => {
    result.differences++
    if (result.items.length < maxItems) result.items.push(item)
    else result.truncated = true
  }
  /** For a converted cell: the text and link that were written. Null for any other cell. */
  const writtenOf = (record: CellRecord | undefined) => {
    if (!record || !wanted.has(record.sheet) || record.text === null || !hasHtml(record.text)) return null
    const cell = snapshot.workbook.getWorksheet(record.sheet)?.findCell(record.row, record.col)
    return cell ? savedText(cell) : { text: '' }
  }

  const compare = (sheet: string, address: string, cell: ExcelJS.Cell | undefined) => {
    const key = keyOf(sheet, address)
    seen.add(key)
    result.compared++
    report({ stage: 'verifying', done: result.compared, total, unit: 'cells', detail: sheet })
    const record = cells.get(key)
    const written = writtenOf(record)
    if (written && record?.text) {
      const actual = cell ? savedText(cell) : { text: '' }
      if (actual.text !== written.text || actual.link !== written.link) {
        add({
          section: sheet,
          location: address,
          severity: 'issue',
          kind: 'saved',
          source: record.text,
          converted: written.text,
          saved: actual.text
        })
      }
      return
    }
    const now = cell && cell.type !== ExcelJS.ValueType.Null ? serializeValue(cell) : 'null'
    const before = record?.value ?? 'null'
    if (now !== before) {
      const original = record ? (record.text ?? before) : ''
      add({
        section: sheet,
        location: address,
        severity: 'issue',
        kind: 'untouched',
        source: original,
        converted: original,
        saved: cell ? (cellText(cell) ?? now) : ''
      })
    }
  }

  for (const sheet of saved.worksheets) {
    sheet.eachRow({ includeEmpty: false }, (row) =>
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (cell.type !== ExcelJS.ValueType.Null || cells.has(keyOf(sheet.name, cell.address))) {
          compare(sheet.name, cell.address, cell)
        }
      })
    )
  }
  // Cells of the original that the saved file no longer has
  for (const [key, record] of cells) if (!seen.has(key)) compare(record.sheet, record.address, undefined)
  report({ stage: 'verifying', done: result.compared, total: result.compared, unit: 'cells' }, true)
  return result
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
