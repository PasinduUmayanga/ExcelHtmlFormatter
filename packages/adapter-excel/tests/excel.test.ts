import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { friendlyReadError, readWorkbook, summarizeWorkbook } from '../src/excel'
import { buildSampleWorkbook } from '../scripts/sampleWorkbook.mts'

const file = { path: 'sample.xlsx', name: 'sample.xlsx', sizeBytes: 1 }

/** Write the sample to a real .xlsx and read it back, exactly as the app does. */
async function roundTrip() {
  const dir = mkdtempSync(join(tmpdir(), 'ehf-'))
  const path = join(dir, 'sample.xlsx')
  await buildSampleWorkbook().xlsx.writeFile(path)
  return summarizeWorkbook(await readWorkbook(path), { ...file, path })
}

describe('summarizeWorkbook (real .xlsx round trip)', async () => {
  const summary = await roundTrip()
  const sheet = (name: string) => summary.sections.find((s) => s.name === name)!

  it('lists every sheet in workbook order, including hidden ones', () => {
    expect(summary.sections.map((s) => [s.name, s.state])).toEqual([
      ['Products', 'visible'],
      ['Team', 'visible'],
      ['Science', 'visible'],
      ['Formatting', 'visible'],
      ['Summary', 'visible'],
      ['Lookup', 'hidden']
    ])
  })

  it('reports the used size of each sheet', () => {
    expect(sheet('Products').sizeLabel).toBe('6 × 6')
    expect(sheet('Summary').sizeLabel).toBe('4 × 2')
  })

  it('counts tags in text cells only, ignoring formulas and hyperlinks', () => {
    const { scan } = sheet('Products')
    expect(scan.htmlCells).toBe(10)
    expect(scan.tags.b).toMatchObject({ count: 7, firstCell: 'B2' })
    // 7 in the descriptions; the "<i>link</i>" hyperlink in F2 must not be counted
    expect(scan.tags.i).toMatchObject({ count: 7, firstCell: 'C2' })
    expect(scan.tags.mark).toMatchObject({ count: 1, firstCell: 'C5' })
    expect(Object.keys(scan.tags).sort()).toEqual(['b', 'br', 'i', 'mark', 'u'])
  })

  it('reads existing rich text as plain text, and counts merged cells once', () => {
    const { scan } = sheet('Team')
    expect(scan.tags.sup).toMatchObject({ count: 1, firstCell: 'A6', sample: 'Already <sup>rich</sup>' })
    expect(scan.tags.em).toMatchObject({ count: 1, firstCell: 'A8' })
    expect(scan.htmlCells).toBe(11)
  })

  it('finds nothing in a sheet without HTML', () => {
    expect(sheet('Summary').scan).toEqual({ htmlCells: 0, tags: {} })
  })
})

describe('summarizeWorkbook (in memory)', () => {
  it('handles an empty workbook and an empty sheet', () => {
    const wb = new ExcelJS.Workbook()
    expect(summarizeWorkbook(wb, file).sections).toEqual([])
    wb.addWorksheet('Blank')
    expect(summarizeWorkbook(wb, file).sections).toEqual([
      { name: 'Blank', state: 'visible', sizeLabel: '0 × 0', scan: { htmlCells: 0, tags: {} } }
    ])
  })
})

describe('readWorkbook errors', () => {
  it('gives a helpful message for a file that is not a workbook', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ehf-'))
    const path = join(dir, 'fake.xlsx')
    writeFileSync(path, 'this is not a zip file')
    await expect(readWorkbook(path)).rejects.toThrow(/could not be read as an Excel workbook/)
  })

  it('explains a missing file', async () => {
    await expect(readWorkbook(join(tmpdir(), 'does-not-exist-ehf.xlsx'))).rejects.toThrow(/could not be found/)
  })

  it('maps file-lock errors', () => {
    expect(friendlyReadError(Object.assign(new Error('x'), { code: 'EBUSY' }))).toMatch(/Close it in Excel/)
  })
})
