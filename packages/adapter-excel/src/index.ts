// @hf/adapter-excel: everything specific to .xlsx files (Node only: uses ExcelJS and the file system).
// The window must import '@hf/adapter-excel/format' instead.
import type ExcelJS from 'exceljs'
import type { FormatAdapter } from '@hf/core'
import {
  checkWorkbook,
  convertWorkbook,
  readWorkbook,
  sheetPreview,
  snapshotWorkbook,
  summarizeWorkbook,
  verifyWorkbook,
  writeWorkbookSafely,
  type WorkbookSnapshot
} from './excel'
import type { SheetPreview } from './format'

export const excelAdapter: FormatAdapter<ExcelJS.Workbook, SheetPreview> = {
  read: readWorkbook,
  summarize: summarizeWorkbook,
  preview(workbook, section) {
    const sheet = workbook.getWorksheet(section)
    if (!sheet) throw new Error('That sheet no longer exists.')
    return sheetPreview(sheet)
  },
  convert: convertWorkbook,
  write: writeWorkbookSafely,
  check: checkWorkbook,
  snapshot: snapshotWorkbook,
  verify: (saved, snapshot, sections, options, onProgress) =>
    verifyWorkbook(saved, snapshot as WorkbookSnapshot, sections, options, onProgress)
}

export * from './excel'
export * from './excelRichText'
export * from './format'
