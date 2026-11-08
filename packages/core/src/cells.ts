import type { CellText } from './scanTags'

/** 0 -> "A", 25 -> "Z", 26 -> "AA", 701 -> "ZZ", 702 -> "AAA" */
export function columnName(index: number): string {
  let name = ''
  let n = index + 1
  while (n > 0) {
    const rem = (n - 1) % 26
    name = String.fromCharCode(65 + rem) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

/** Turns a grid of values into addressed cells, skipping empty ones. Row 0 is Excel row 1. */
export function* cellsFromRows(rows: readonly (readonly unknown[])[]): Generator<CellText> {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const value = rows[r][c]
      if (value === null || value === undefined || value === '') continue
      yield { address: columnName(c) + (r + 1), text: String(value) }
    }
  }
}
