// Checks for values the window sends over IPC, and results the main process builds itself.
// No Electron imports, so they can be unit-tested.
import { basename } from 'node:path'
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

/**
 * The Save dialog's starting file name: the name the user typed on the Export screen, or `fallback`. Only a name is
 * kept (no folders), characters Windows and macOS refuse are removed, and the format's extension is added (ADR 0017).
 */
export function outputFileName(name: unknown, fallback: string, extension: string): string {
  const typed = typeof name === 'string' ? basename(name.replace(/\\/g, '/')) : ''
  // Control characters are exactly what must go, so this pattern needs them.
  // eslint-disable-next-line no-control-regex
  const unsafe = /[<>:"/\\|?*\u0000-\u001f]/g
  let clean = typed.replace(unsafe, '').trim().slice(0, 200)
  if (clean.toLowerCase().endsWith(`.${extension}`)) clean = clean.slice(0, -extension.length - 1).trim()
  return `${clean.replace(/[. ]+$/, '') || fallback}.${extension}`
}
