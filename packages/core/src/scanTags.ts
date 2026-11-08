import { tokenize } from './tokenize'

export interface CellText {
  /** Excel address, e.g. "B4" */
  address: string
  text: string
}

export interface TagUsage {
  /** How many times the tag is opened across all cells */
  count: number
  /** Address of the first cell that uses it */
  firstCell: string
  /** The full text of that first cell, for previews */
  sample: string
}

export interface TagScan {
  /** Cells that contain at least one HTML tag */
  htmlCells: number
  tags: Record<string, TagUsage>
}

/** Finds which HTML tags are used in a set of cells, how often, and where first. */
export function scanCells(cells: Iterable<CellText>): TagScan {
  const tags: Record<string, TagUsage> = {}
  let htmlCells = 0

  for (const { address, text } of cells) {
    if (!text || !text.includes('<')) continue
    let cellHasHtml = false
    for (const token of tokenize(text)) {
      if (token.type === 'close') cellHasHtml = true
      if (token.type !== 'open') continue
      cellHasHtml = true
      const usage = (tags[token.tag] ??= { count: 0, firstCell: address, sample: text })
      usage.count++
    }
    if (cellHasHtml) htmlCells++
  }
  return { htmlCells, tags }
}

/** Tags sorted by how often they are used (most first), then by name. */
export function sortedTags(scan: TagScan): [string, TagUsage][] {
  return Object.entries(scan.tags).sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
}

/** Merges the scans of several sections into one (used for workbook-wide totals). */
export function mergeScans(scans: TagScan[]): TagScan {
  const merged: TagScan = { htmlCells: 0, tags: {} }
  for (const scan of scans) {
    merged.htmlCells += scan.htmlCells
    for (const [tag, usage] of Object.entries(scan.tags)) {
      const target = merged.tags[tag]
      if (target) target.count += usage.count
      else merged.tags[tag] = { ...usage }
    }
  }
  return merged
}
