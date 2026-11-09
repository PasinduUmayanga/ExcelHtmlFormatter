import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defaultConfig, reportToCsv, type JobProgress } from '@hf/core'
import {
  checkWorkbook,
  convertCell,
  convertWorkbook,
  HIGHLIGHT_FILL,
  readWorkbook,
  savedText,
  snapshotWorkbook,
  verifyWorkbook,
  writeWorkbookSafely
} from '../src/excel'
import { excelAdapter } from '../src/index'
import { buildSampleWorkbook } from '../scripts/sampleWorkbook.mts'

const config = defaultConfig()

/** A workbook with the given cells in sheet "S" (plus an untouched sheet "Other"). */
function book(cells: Record<string, ExcelJS.CellValue>): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  const sheet = wb.addWorksheet('S')
  for (const [address, value] of Object.entries(cells)) sheet.getCell(address).value = value
  wb.addWorksheet('Other').getCell('A1').value = '<b>not selected</b>'
  return wb
}

/** Saves to a real .xlsx and reads it back. */
async function roundTrip(wb: ExcelJS.Workbook): Promise<{ saved: ExcelJS.Workbook; path: string }> {
  const path = join(mkdtempSync(join(tmpdir(), 'ehf-fx-')), 'out.xlsx')
  await writeWorkbookSafely(wb, path)
  return { saved: await readWorkbook(path), path }
}

describe('cell effects (F2-T5), through a real save', () => {
  it('links the cell to the first safe address and keeps its rich text', async () => {
    const wb = book({
      A1: 'See <a href="javascript:x">bad</a> and <a href="https://example.com/a?b=1">the <b>site</b></a>',
      A2: '<a href="https://one.example">1</a> <a href="https://two.example">2</a>'
    })
    const stats = convertWorkbook(wb, ['S'], config)
    expect(stats).toMatchObject({ linksAdded: 2, linksSkipped: 2 })
    const { saved } = await roundTrip(wb)
    const a1 = saved.getWorksheet('S')!.getCell('A1')
    expect(savedText(a1)).toEqual({ text: 'See bad and the site', link: 'https://example.com/a?b=1' })
    const rich = ((a1.value as ExcelJS.CellHyperlinkValue).text as unknown as ExcelJS.CellRichTextValue).richText
    expect(rich.find((r) => r.text === 'site')?.font).toMatchObject({ bold: true, underline: true })
    expect(savedText(saved.getWorksheet('S')!.getCell('A2')).link).toBe('https://one.example/')
  })

  it('fills a fully highlighted cell yellow, and only that one', async () => {
    const wb = book({ A1: '<mark>all of it</mark>', A2: 'only <mark>part</mark>' })
    expect(convertWorkbook(wb, ['S'], config).highlighted).toBe(1)
    const { saved } = await roundTrip(wb)
    expect(saved.getWorksheet('S')!.getCell('A1').fill).toEqual(HIGHLIGHT_FILL)
    expect(saved.getWorksheet('S')!.getCell('A2').fill).toBeUndefined()
  })

  it('wraps text with line breaks from lists, tables and <br>', async () => {
    const wb = book({ A1: '<ul><li>a</li><li>b</li></ul>', A2: '<b>one line</b>' })
    expect(convertWorkbook(wb, ['S'], config).withLineBreaks).toBe(1)
    const { saved } = await roundTrip(wb)
    const a1 = saved.getWorksheet('S')!.getCell('A1')
    expect(savedText(a1).text).toBe('•  a\n•  b')
    expect(a1.alignment?.wrapText).toBe(true)
    expect(saved.getWorksheet('S')!.getCell('A2').alignment?.wrapText).toBeUndefined()
  })

  it('leaves links, formulas and numbers exactly as they were', () => {
    const wb = book({
      A1: { text: '<b>x</b>', hyperlink: 'https://x.example' },
      A2: { formula: '"<b>"&"x"', result: '<b>x</b>' },
      A3: 5
    })
    for (const address of ['A1', 'A2', 'A3']) {
      const cell = wb.getWorksheet('S')!.getCell(address)
      const before = JSON.stringify(cell.value)
      expect(convertCell(cell, config)).toBeNull()
      expect(JSON.stringify(cell.value)).toBe(before)
    }
  })
})

describe('checkWorkbook (checks A and D before saving)', () => {
  it('finds no issues in the sample and changes nothing', () => {
    const wb = buildSampleWorkbook()
    const before = JSON.stringify(wb.getWorksheet('Team')!.getCell('A2').value)
    const updates: JobProgress[] = []
    const report = checkWorkbook(wb, ['Products', 'Team', 'Science'], config, (p) => updates.push(p))
    expect(report).toMatchObject({ checked: 27, complete: 27, issues: 0, items: [] })
    expect(JSON.stringify(wb.getWorksheet('Team')!.getCell('A2').value)).toBe(before)
    expect(updates[0].stage).toBe('checking')
  })

  it('reports cells that are too long, and notes skipped links', () => {
    const wb = book({ A1: `<b>${'x'.repeat(33000)}</b>`, B2: '<a href="file:///c:/secret">x</a>' })
    const report = excelAdapter.check(wb, ['S'], config)
    expect(report).toMatchObject({ checked: 2, complete: 1, issues: 1, notes: 1 })
    expect(report.items.map((i) => [i.location, i.severity, i.kind])).toEqual([
      ['A1', 'issue', 'limit'],
      ['B2', 'note', 'note']
    ])
    expect(reportToCsv(report.items)).toContain('B2,note,note,Link not added (unsafe address): file:///c:/secret')
  })
})

describe('verifyWorkbook (checks B and C after saving)', () => {
  async function saveSample() {
    const original = buildSampleWorkbook()
    const snapshot = excelAdapter.snapshot(original)
    convertWorkbook(original, ['Products', 'Team'], config)
    const { saved, path } = await roundTrip(original)
    return { snapshot, saved, path }
  }

  it('finds no differences after a normal save', async () => {
    const { saved, snapshot } = await saveSample()
    const updates: JobProgress[] = []
    const result = excelAdapter.verify(saved, snapshot, ['Products', 'Team'], config, (p) => updates.push(p))
    expect(result).toMatchObject({ differences: 0, items: [], truncated: false })
    expect(result.compared).toBeGreaterThan(50)
    expect(updates[updates.length - 1]).toMatchObject({ stage: 'verifying', unit: 'cells' })
  })

  it('detects a converted cell that lost text, and a changed untouched cell', async () => {
    const { saved, snapshot } = await saveSample()
    const team = saved.getWorksheet('Team')!
    team.getCell('A2').value = 'my name is' // converted cell: "pasindu" is gone
    saved.getWorksheet('Summary')!.getCell('B2').value = 'changed' // a sheet that was not converted
    saved.getWorksheet('Products')!.getCell('E2').value = { formula: '1+1', result: 2 } // a formula cell
    const result = verifyWorkbook(saved, snapshot as ReturnType<typeof snapshotWorkbook>, ['Products', 'Team'], config)
    expect(result.items.map((i) => [i.section, i.location, i.kind])).toEqual([
      ['Products', 'E2', 'untouched'],
      ['Team', 'A2', 'saved'],
      ['Summary', 'B2', 'untouched']
    ])
    expect(result.items[1]).toMatchObject({ converted: 'my name is pasindu', saved: 'my name is' })
  })

  it('detects a missing link, and cells that were added or removed', async () => {
    const original = book({ A1: '<a href="https://x.example">x</a>', A2: 'plain' })
    const snapshot = snapshotWorkbook(original)
    convertWorkbook(original, ['S'], config)
    const { saved } = await roundTrip(original)
    saved.getWorksheet('S')!.getCell('A1').value = 'x' // the link is gone
    saved.getWorksheet('S')!.getCell('A2').value = null // removed
    saved.getWorksheet('S')!.getCell('C9').value = 'new' // added
    const result = verifyWorkbook(saved, snapshot, ['S'], config)
    expect(result.items.map((i) => [i.location, i.kind, i.saved])).toEqual([
      ['A1', 'saved', 'x'],
      ['C9', 'untouched', 'new'],
      ['A2', 'untouched', '']
    ])
  })
})

describe('the sample "Formatting" sheet (every F2 tag), through a real save', async () => {
  const wb = buildSampleWorkbook()
  const stats = convertWorkbook(wb, ['Formatting'], config)
  const { saved } = await roundTrip(wb)
  const sheet = saved.getWorksheet('Formatting')!
  const row = (label: string) => {
    let found: ExcelJS.Cell | undefined
    sheet.eachRow((r) => {
      if (r.getCell(1).value === label) found = r.getCell(2)
    })
    return found!
  }

  it('reports links, highlight and notes, with no content issues', () => {
    expect(stats).toMatchObject({ converted: 14, linksAdded: 2, linksSkipped: 2, highlighted: 1 })
    expect(stats.check).toMatchObject({ checked: 14, complete: 14, issues: 0, notes: 2 })
  })

  it('writes the expected text for each case', () => {
    const expected: Record<string, string> = {
      Headings: 'Title\nSubtitle\nBody text',
      'Bulleted list': '•  One\n   ◦  Two\n      ▪  Three\n•  Back to one',
      'Numbered list': '3. Third\n4. Fourth',
      Table: 'Size │ Price\nSmall │ 1,200\nLarge │ 2,000',
      'Unsafe link': 'Do not click this',
      'Inline styles': 'Valid CSS and invalid CSS',
      'Quote and code': '    Quoted text\nRun npm test',
      Preformatted: 'Name   Qty\nTea    2',
      'Deleted and rule': `Old price New price\n${'─'.repeat(16)}\nFooter`,
      Paragraphs: 'First paragraph.\nSecond strong and em.'
    }
    for (const [label, text] of Object.entries(expected))
      expect([label, savedText(row(label)).text]).toEqual([label, text])
  })

  it('links, fills and wraps the right cells', () => {
    expect(savedText(row('Link')).link).toBe('https://example.com/tea')
    expect(savedText(row('Two links')).link).toBe('https://example.com/a')
    expect(savedText(row('Unsafe link')).link).toBeUndefined()
    expect(row('Whole cell marked').fill).toEqual(HIGHLIGHT_FILL)
    expect(row('Part marked').fill).toBeUndefined()
    expect(row('Bulleted list').alignment?.wrapText).toBe(true)
    expect(row('Link').alignment?.wrapText).toBeUndefined()
  })
})

describe('savedText and verification limits', () => {
  it('reads every kind of saved value', () => {
    const wb = book({
      A1: 5,
      A2: { richText: [{ text: 'a' }, { text: 'b', font: { bold: true } }] },
      A3: { text: 'plain link', hyperlink: 'https://x.example' }
    })
    const s = wb.getWorksheet('S')!
    expect(savedText(s.getCell('A1'))).toEqual({ text: '5' })
    expect(savedText(s.getCell('A2'))).toEqual({ text: 'ab' })
    expect(savedText(s.getCell('A3'))).toEqual({ text: 'plain link', link: 'https://x.example' })
    expect(savedText(s.getCell('B9'))).toEqual({ text: '' })
  })

  it('keeps counting differences after the list is full', () => {
    const original = book({ A1: 'a', A2: 'b', A3: 'c' })
    const snapshot = snapshotWorkbook(original)
    for (const a of ['A1', 'A2', 'A3']) original.getWorksheet('S')!.getCell(a).value = 'changed'
    const result = verifyWorkbook(original, snapshot, ['S'], config, undefined, 2)
    expect(result).toMatchObject({ differences: 3, truncated: true })
    expect(result.items).toHaveLength(2)
  })
})

describe('tags with no style', () => {
  it('are reported once per workbook, sorted', () => {
    const wb = book({ A1: '<zeta>x</zeta> <custom>y</custom>', A2: '<custom>z</custom>' })
    expect(convertWorkbook(wb, ['S'], config).unknownTags).toEqual(['custom', 'zeta'])
  })
})
