import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { mkdtempSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { convertCell, convertWorkbook, readWorkbook, sheetPreview, writeWorkbookSafely, baseFont } from '../src/excel'
import { buildSampleWorkbook } from '../scripts/sampleWorkbook.mts'
import { defaultConfig } from '@hf/core'
import { toExcelFont } from '../src/excelRichText'

const config = defaultConfig()
const SHEETS = ['Products', 'Team', 'Science']

/** Convert the sample, save it as a real .xlsx, and read it back, exactly as the app does. */
async function convertAndReopen(options = config, sheets = SHEETS) {
  const dir = mkdtempSync(join(tmpdir(), 'ehf-'))
  const source = join(dir, 'in.xlsx')
  const target = join(dir, 'out.xlsx')
  await buildSampleWorkbook().xlsx.writeFile(source)
  const wb = await readWorkbook(source)
  const stats = convertWorkbook(wb, sheets, options)
  await writeWorkbookSafely(wb, target)
  return { stats, out: await readWorkbook(target), dir }
}

describe('convertWorkbook (real .xlsx round trip)', async () => {
  const { stats, out, dir } = await convertAndReopen()
  const cell = (sheet: string, address: string) => out.getWorksheet(sheet)!.getCell(address)

  it('reports what it did', () => {
    expect(stats).toEqual({
      sections: [
        { name: 'Products', converted: 10 },
        { name: 'Team', converted: 11 },
        { name: 'Science', converted: 6 }
      ],
      converted: 27,
      withLineBreaks: 1,
      unknownTags: ['mark', 'span']
    })
  })

  it('writes real rich text', () => {
    expect(cell('Team', 'A2').value).toEqual({
      richText: [
        { text: 'my name', font: { bold: true } },
        { text: ' is ' },
        { text: 'pasindu', font: { italic: true } }
      ]
    })
    expect(cell('Products', 'B2').value).toEqual({ richText: [{ text: 'Ceylon Black', font: { bold: true } }] })
  })

  it('writes superscript, subscript and combined styles', () => {
    expect((cell('Science', 'B2').value as ExcelJS.CellRichTextValue).richText).toEqual([
      { text: 'H' },
      { text: '2', font: { vertAlign: 'subscript' } },
      { text: 'O' }
    ])
    expect((cell('Products', 'C5').value as ExcelJS.CellRichTextValue).richText[0]).toEqual({
      text: 'Rare',
      font: { bold: true, italic: true }
    })
  })

  it('turns on wrap text for cells with line breaks', () => {
    const c3 = cell('Products', 'C3')
    expect((c3.value as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join('')).toBe('Light and floral.\nBest served without milk')
    expect(c3.alignment?.wrapText).toBe(true)
    expect(cell('Products', 'C2').alignment?.wrapText).toBeFalsy()
  })

  it('removes tags with no style but keeps their text', () => {
    const rich = (cell('Products', 'C5').value as ExcelJS.CellRichTextValue).richText
    expect(rich.map((r) => r.text).join('')).toBe('Rare hand-rolled buds, limited stock')
  })

  it('leaves formulas, links, numbers, dates and plain text alone', () => {
    expect(cell('Products', 'E2').value).toMatchObject({ formula: '"<b>"&B2&"</b>"' })
    expect(cell('Products', 'F2').value).toMatchObject({ text: '<i>link</i>', hyperlink: 'https://example.com' })
    expect(cell('Products', 'D2').value).toBe(1200)
    expect(cell('Summary', 'B3').value).toEqual(new Date(Date.UTC(2026, 10, 8)))
    expect(cell('Products', 'A2').value).toBe('TEA-001')
    expect(cell('Summary', 'B4').value).toBe('x < 5 is not a tag')
  })

  it('converts the top-left cell of a merged range and keeps the merge', () => {
    expect(cell('Team', 'A8').value).toEqual({ richText: [{ text: 'merged', font: { italic: true } }, { text: ' title' }] })
    expect(cell('Team', 'B8').isMerged).toBe(true)
  })

  it('converts existing rich text from its plain text', () => {
    expect(cell('Team', 'A6').value).toEqual({ richText: [{ text: 'Already ' }, { text: 'rich', font: { vertAlign: 'superscript' } }] })
  })

  it('does not touch sheets that were not selected, and keeps hidden sheets hidden', () => {
    expect(cell('Lookup', 'B2').value).toBe('<b>Active</b>')
    expect(out.getWorksheet('Lookup')!.state).toBe('hidden')
    expect(out.worksheets.map((s) => s.name)).toEqual(['Products', 'Team', 'Science', 'Summary', 'Lookup'])
  })

  it('leaves no temporary files behind', () => {
    expect(readdirSync(dir).sort()).toEqual(['in.xlsx', 'out.xlsx'])
  })
})

describe('convertWorkbook options', () => {
  it('keeps tags with no style as text when asked', async () => {
    const { out } = await convertAndReopen({ ...config, unknownTagAction: 'keep' }, ['Products'])
    const rich = (out.getWorksheet('Products')!.getCell('C5').value as ExcelJS.CellRichTextValue).richText
    expect(rich.map((r) => r.text).join('')).toBe('Rare hand-rolled buds, <mark>limited stock</mark>')
  })

  it('applies custom colors, sizes and fonts', async () => {
    const rules = { ...config.rules, mark: { bold: true, color: '#C00000', size: 14, font: 'Georgia' } }
    const { out } = await convertAndReopen({ ...config, rules }, ['Products'])
    const rich = (out.getWorksheet('Products')!.getCell('C5').value as ExcelJS.CellRichTextValue).richText
    expect(rich[rich.length - 1]).toEqual({ text: 'limited stock', font: { bold: true, color: { argb: 'FFC00000' }, size: 14, name: 'Georgia' } })
  })
})

describe('convertCell', () => {
  const sheet = () => new ExcelJS.Workbook().addWorksheet('S')

  it("keeps the cell's own font in every run", () => {
    const c = sheet().getCell('A1')
    c.font = { name: 'Arial', size: 12, color: { argb: 'FF0000FF' }, family: 2 }
    c.value = 'a <b>b</b>'
    convertCell(c, config)
    expect(c.value).toEqual({
      richText: [
        { text: 'a ', font: { name: 'Arial', size: 12, family: 2, color: { argb: 'FF0000FF' } } },
        { text: 'b', font: { name: 'Arial', size: 12, family: 2, color: { argb: 'FF0000FF' }, bold: true } }
      ]
    })
  })

  it('keeps theme colors', () => {
    const c = sheet().getCell('A1')
    c.font = { color: { theme: 1 } }
    expect(baseFont(c)).toEqual({ color: { theme: 1 } })
  })

  it('drops the theme font scheme when a tag sets its own font', () => {
    expect(toExcelFont({ font: 'Georgia' }, { name: 'Calibri', scheme: 'minor', family: 2, size: 11 })).toEqual({ name: 'Georgia', size: 11 })
  })

  it('empties a cell whose HTML has no text', () => {
    const c = sheet().getCell('A1')
    c.value = '<b></b>'
    expect(convertCell(c, config)).toEqual({ wrapped: false, unknownTags: [] })
    expect(c.value).toBeNull()
  })

  it('ignores cells without HTML', () => {
    const c = sheet().getCell('A1')
    c.value = 'plain'
    expect(convertCell(c, config)).toBeNull()
    expect(c.value).toBe('plain')
  })
})

describe('sheetPreview', () => {
  it('returns display values and marks HTML cells', () => {
    const wb = buildSampleWorkbook()
    const p = sheetPreview(wb.getWorksheet('Products')!)
    expect(p.rows[0]).toEqual([{ text: 'SKU' }, { text: 'Product' }, { text: 'Description' }, { text: 'Price' }, null, null])
    expect(p.rows[1][1]).toEqual({ text: '<b>Ceylon Black</b>', html: true })
    expect(p.rows[1][3]).toEqual({ text: '1200' })
    expect(p.rows[1][4]).toEqual({ text: '<b>formula</b>' }) // formula result, not converted
    expect(p.rows[1][5]).toEqual({ text: '<i>link</i>' }) // hyperlink text, not converted
    expect(p.truncated).toBe(false)
  })

  it('shows dates as yyyy-mm-dd and merged-over cells as empty', () => {
    const wb = buildSampleWorkbook()
    expect(sheetPreview(wb.getWorksheet('Summary')!).rows[2][1]).toEqual({ text: '2026-11-08' })
    const team = sheetPreview(wb.getWorksheet('Team')!)
    expect(team.rows[7]).toEqual([{ text: '<em>merged</em> title', html: true }, null, null])
  })

  it('limits the preview size on big sheets', () => {
    const ws = new ExcelJS.Workbook().addWorksheet('Big')
    ws.getCell(500, 40).value = 'x'
    const p = sheetPreview(ws)
    expect([p.rows.length, p.rows[0].length, p.truncated, p.rowCount, p.columnCount]).toEqual([200, 30, true, 500, 40])
  })
})

describe('writeWorkbookSafely', () => {
  it('reports a clear error and cleans up when the target cannot be written', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ehf-'))
    const target = join(dir, 'missing-folder', 'out.xlsx')
    await expect(writeWorkbookSafely(buildSampleWorkbook(), target)).rejects.toThrow(/could not be saved/)
    expect(existsSync(target + '.saving')).toBe(false)
  })
})
