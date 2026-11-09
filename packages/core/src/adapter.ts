import type { ConvertOptions } from './htmlToRuns'
import type { DocumentSummary, ExportStats, JobProgress, PickedFile } from './types'
import type { ContentReport, SaveVerification } from './verify/report'

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
  /**
   * The content proof for the chosen sections, without changing `doc` (checks A and D).
   * Uses the same conversion as `convert`, so the result matches what a save would produce.
   */
  check(doc: Doc, sections: string[], options: ConvertOptions, onProgress?: ProgressCallback): ContentReport
  /**
   * Records the original document before `convert` changes it: whatever `verify` needs to tell
   * that untouched items stayed the same. Opaque to the shell, which only passes it back.
   */
  snapshot(doc: Doc): unknown
  /**
   * Compares a saved file, read back from disk, with the snapshot of the original (checks B and C):
   * converted items must hold the converted text, and everything else must be unchanged.
   */
  verify(
    saved: Doc,
    snapshot: unknown,
    sections: string[],
    options: ConvertOptions,
    onProgress?: ProgressCallback
  ): SaveVerification
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
