import type { ConvertOptions } from './htmlToRuns'
import type { DocumentSummary, ExportStats, JobProgress, PickedFile } from './types'

export type ProgressCallback = (progress: JobProgress) => void

/**
 * What a file format must provide. The shared desktop shell runs these steps in a
 * background worker thread; nothing else in the app is format-specific.
 *
 * `Doc` is the format's in-memory document (e.g. an ExcelJS workbook) and `Preview` is
 * the data the format's preview screen shows (e.g. a grid of cells).
 */
export interface FormatAdapter<Doc = unknown, Preview = unknown> {
  /** Reads a file from disk. Throws an Error with a message the user can act on. */
  read(path: string): Promise<Doc>
  /** Lists the sections and the tags each one uses. */
  summarize(doc: Doc, file: PickedFile, onProgress?: ProgressCallback): DocumentSummary
  /** Preview data for one section. Throws if the section does not exist. */
  preview(doc: Doc, section: string): Preview
  /** Replaces HTML with real formatting in the chosen sections (changes `doc` in memory). */
  convert(doc: Doc, sections: string[], options: ConvertOptions, onProgress?: ProgressCallback): ExportStats
  /** Writes the document safely: never leaves a half-written file behind. */
  write(doc: Doc, path: string): Promise<void>
}

/** Passes on at most one progress update every `intervalMs` (plus any update marked `force`). */
export function throttle(onProgress?: ProgressCallback, intervalMs = 100) {
  let last = 0
  return (progress: JobProgress, force = false) => {
    if (!onProgress) return
    const now = Date.now()
    if (force || now - last >= intervalMs) {
      last = now
      onProgress(progress)
    }
  }
}
