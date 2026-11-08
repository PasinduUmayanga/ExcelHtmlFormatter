// @hf/adapter-excel: everything specific to .xlsx files (Node only: uses ExcelJS and the file system).
// The window must import '@hf/adapter-excel/format' instead.
import type ExcelJS from 'exceljs'
import type { FormatAdapter } from '@hf/core'
import { convertWorkbook, readWorkbook, sheetPreview, summarizeWorkbook, writeWorkbookSafely } from './excel'
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
  write: writeWorkbookSafely
}

export * from './excel'
export * from './excelRichText'
export * from './format'
