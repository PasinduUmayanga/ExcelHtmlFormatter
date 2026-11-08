import { describe, expect, it } from 'vitest'
import { mergeScans, scanCells, sortedTags } from '../src/scanTags'
import { cellsFromRows, columnName } from '../src/cells'
import { hasHtml, tokenize } from '../src/tokenize'

const rows = [
  ['SKU', 'Product', 'Description'],
  ['TEA-001', '<b>Ceylon Black</b>', 'Strong <i>high-grown</i> tea from <b>Nuwara Eliya</b>'],
  ['TEA-002', '<b>Green</b>', 'Light<br>and <i>floral</i>'],
  ['TEA-003', 'Plain name', 'x < 5'],
  [null, '', undefined, 'Only </b> closing']
]

describe('scanCells', () => {
  const scan = scanCells(cellsFromRows(rows))

  it('counts cells that contain HTML', () => {
    // B2, C2, B3, C3 and D5 (a stray closing tag still counts); "x < 5" does not
    expect(scan.htmlCells).toBe(5)
  })

  it('counts each tag and remembers the first cell', () => {
    expect(scan.tags.b).toEqual({ count: 3, firstCell: 'B2', sample: '<b>Ceylon Black</b>' })
    expect(scan.tags.i).toEqual({ count: 2, firstCell: 'C2', sample: rows[1][2] })
    expect(scan.tags.br).toEqual({ count: 1, firstCell: 'C3', sample: 'Light<br>and <i>floral</i>' })
  })

  it('sorts tags by usage, then by name', () => {
    expect(sortedTags(scan).map(([t]) => t)).toEqual(['b', 'i', 'br'])
  })

  it('returns nothing for a sheet without HTML', () => {
    expect(
      scanCells(
        cellsFromRows([
          ['a', 'b'],
          ['1 < 2', '']
        ])
      )
    ).toEqual({ htmlCells: 0, tags: {} })
  })

  it('merges scans from several sheets', () => {
    const other = scanCells([{ address: 'A1', text: '<b>x</b><u>y</u>' }])
    const merged = mergeScans([scan, other])
    expect(merged.htmlCells).toBe(6)
    expect(merged.tags.b.count).toBe(4)
    expect(merged.tags.b.firstCell).toBe('B2')
    expect(merged.tags.u).toEqual({ count: 1, firstCell: 'A1', sample: '<b>x</b><u>y</u>' })
    expect(scan.tags.b.count).toBe(3) // inputs are not changed
  })
})

describe('cells helpers', () => {
  it('names columns like Excel', () => {
    expect([0, 1, 25, 26, 27, 51, 52, 701, 702].map(columnName)).toEqual([
      'A',
      'B',
      'Z',
      'AA',
      'AB',
      'AZ',
      'BA',
      'ZZ',
      'AAA'
    ])
  })

  it('skips empty cells and numbers rows from 1', () => {
    expect([...cellsFromRows([[null, 'x'], [], ['', 5]])]).toEqual([
      { address: 'B1', text: 'x' },
      { address: 'B3', text: '5' }
    ])
  })
})

describe('tokenize / hasHtml', () => {
  it('splits text, open, close and comment tokens', () => {
    expect(tokenize('a<b x="1">c</b><!--n--><br/>')).toEqual([
      { type: 'text', text: 'a' },
      { type: 'open', tag: 'b', raw: '<b x="1">', selfClosing: false },
      { type: 'text', text: 'c' },
      { type: 'close', tag: 'b', raw: '</b>' },
      { type: 'comment', raw: '<!--n-->' },
      { type: 'open', tag: 'br', raw: '<br/>', selfClosing: true }
    ])
  })

  it('detects HTML', () => {
    expect(hasHtml('<b>x</b>')).toBe(true)
    expect(hasHtml('a</i>')).toBe(true)
    expect(hasHtml('x < 5 > 3')).toBe(false)
    expect(hasHtml('<!-- only a comment -->')).toBe(false)
    expect(hasHtml('&lt;b&gt;')).toBe(false)
  })
})
