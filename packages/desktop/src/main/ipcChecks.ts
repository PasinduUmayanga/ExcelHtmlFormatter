// Checks for values the window sends over IPC, and results the main process builds itself.
// No Electron imports, so they can be unit-tested.
import type { SaveVerification } from '@hf/core'

/** The largest CSV report the window may ask to save (far above any real report). */
export const MAX_REPORT_CHARS = 200 * 1024 * 1024

/** The chosen sections, as sent by the window: a non-empty list of names. */
export function sectionList(sections: unknown, plural: string): string[] {
  if (!Array.isArray(sections) || sections.length === 0 || !sections.every((s) => typeof s === 'string')) {
    throw new Error(`No ${plural} were selected.`)
  }
  return sections
}

/** A CSV report sent by the window: text of a sane size. */
export function reportText(csv: unknown): string {
  if (typeof csv !== 'string' || csv.length > MAX_REPORT_CHARS) throw new Error('The report could not be saved.')
  return csv
}

/** A verification result for a saved file that could not be read back at all. */
export function unreadableSave(message: string): SaveVerification {
  return {
    compared: 0,
    differences: 1,
    truncated: false,
    items: [
      {
        section: '',
        location: '',
        severity: 'issue',
        kind: 'saved',
        source: '',
        converted: '',
        saved: `The saved file could not be read back to check it: ${message}`
      }
    ]
  }
}
