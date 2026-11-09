import type { ConvertResult } from '../htmlToRuns'
import type { ContentProof } from './contentProof'

/** Report lists stop growing here (counts stay exact), so a huge file can't flood the window. */
export const MAX_REPORT_ITEMS = 20000

/**
 * What a check found in one converted item (an Excel cell…):
 * - before saving (content proof): 'missing', 'changed', 'spacing', 'limit', or 'note' (nothing wrong,
 *   but something is worth knowing, e.g. a link that was not added);
 * - after saving (re-reading the saved file): 'saved' (a converted item differs from what was
 *   converted) or 'untouched' (an item that should not change did).
 */
export type CheckKind = 'missing' | 'changed' | 'spacing' | 'limit' | 'note' | 'saved' | 'untouched'

export interface CheckItem {
  section: string
  /** Where in the section, e.g. "C7" */
  location: string
  /** Issues stop a save until the user confirms; notes never do */
  severity: 'issue' | 'note'
  kind: CheckKind
  /** The original text (HTML for converted items; the original value for 'untouched') */
  source: string
  /** The converted text, without formatting */
  converted: string
  /** What the saved file contains (checks after saving) */
  saved?: string
  /** The content proof (checks before saving) */
  proof?: ContentProof
}

export interface ContentReport {
  /** Converted items that were checked */
  checked: number
  /** …with no issue (notes allowed) */
  complete: number
  issues: number
  notes: number
  /** Issues first, then notes, in document order; at most MAX_REPORT_ITEMS */
  items: CheckItem[]
  /** True if `items` was cut off at MAX_REPORT_ITEMS */
  truncated: boolean
}

/** The result of re-reading the saved file and comparing it with what was meant to be written. */
export interface SaveVerification {
  /** Items compared (every cell of every sheet, for Excel) */
  compared: number
  differences: number
  items: CheckItem[]
  truncated: boolean
}

export const emptyReport = (): ContentReport => ({
  checked: 0,
  complete: 0,
  issues: 0,
  notes: 0,
  items: [],
  truncated: false
})

/** Collects content proofs into a report (issues listed before notes). */
export class ReportBuilder {
  private readonly issueItems: CheckItem[] = []
  private readonly noteItems: CheckItem[] = []
  private readonly report = emptyReport()

  constructor(private readonly max = MAX_REPORT_ITEMS) {}

  add(section: string, location: string, html: string, result: ConvertResult, proof: ContentProof): void {
    this.report.checked++
    const issue = proof.status !== 'complete'
    if (!issue) this.report.complete++
    if (!issue && proof.notes.length === 0) return
    if (issue) this.report.issues++
    else this.report.notes++
    const list = issue ? this.issueItems : this.noteItems
    if (this.issueItems.length + this.noteItems.length >= this.max) {
      this.report.truncated = true
      return
    }
    list.push({
      section,
      location,
      severity: issue ? 'issue' : 'note',
      kind: kindOf(proof),
      source: html,
      converted: result.plainText,
      proof
    })
  }

  build(): ContentReport {
    return { ...this.report, items: [...this.issueItems, ...this.noteItems] }
  }
}

function kindOf(proof: ContentProof): CheckKind {
  switch (proof.status) {
    case 'complete':
      return 'note'
    case 'missing':
      return proof.missing.length ? 'missing' : 'spacing'
    default:
      return proof.status
  }
}

/** Short plain-English description of an item, for lists and the CSV report. */
export function describeCheckItem(item: CheckItem): string {
  const proof = item.proof
  switch (item.kind) {
    case 'missing':
      return `Missing text: ${(proof?.missing ?? []).map((g) => `"${g.text}"`).join(', ')}`
    case 'spacing':
      return `Spacing changed in preformatted text: ${(proof?.spacing ?? []).map((l) => `"${l}"`).join(', ')}`
    case 'changed':
      return `Text not in the original: ${(proof?.added ?? []).map((g) => `"${g.text}"`).join(', ')}`
    case 'limit':
      return `Too long for one cell: ${(proof?.overLimit ?? 0).toLocaleString('en-US')} characters over the 32,767 limit`
    case 'saved':
      return 'The saved file does not contain the converted text'
    case 'untouched':
      return 'Changed in the saved file, but should not have been'
    case 'note':
      return (proof?.notes ?? []).map(describeNote).join('; ')
  }
}

function describeNote(note: ContentProof['notes'][number]): string {
  switch (note.kind) {
    case 'comment':
      return note.count === 1 ? 'An HTML comment was removed' : `${note.count} HTML comments were removed`
    case 'image':
      return `An image was left out (its text: "${note.alt}")`
    case 'link':
      return note.reason === 'extra'
        ? `Link not added (a cell can have only one): ${note.href}`
        : `Link not added (${note.reason === 'unsafe' ? 'unsafe address' : note.reason === 'too-long' ? 'address too long' : 'not a valid address'}): ${note.href}`
    case 'approximate':
      return 'The texts were too different to compare word by word'
  }
}

/** The report as CSV (Excel-friendly: UTF-8 with BOM, CRLF lines, formulas neutralised). */
export function reportToCsv(items: CheckItem[]): string {
  const header = ['Sheet', 'Cell', 'Severity', 'Kind', 'Description', 'Original', 'Converted', 'Saved']
  const rows = items.map((i) => [
    i.section,
    i.location,
    i.severity,
    i.kind,
    describeCheckItem(i),
    i.source,
    i.converted,
    i.saved ?? ''
  ])
  return '﻿' + [header, ...rows].map((row) => row.map(csvField).join(',')).join('\r\n') + '\r\n'
}

function csvField(value: string): string {
  // A leading = + - @ (or tab / CR) would make Excel run the cell as a formula: prefix a quote.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}
