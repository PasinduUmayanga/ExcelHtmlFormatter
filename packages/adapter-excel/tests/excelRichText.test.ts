import { describe, expect, it } from 'vitest'
import { hexToArgb, toExcelFont, toExcelRichText } from '../src/excelRichText'
import { DEFAULT_RULES, htmlToRuns } from '@hf/core'

describe('hexToArgb', () => {
  it('converts 6- and 3-digit hex colors', () => {
    expect(hexToArgb('#c00000')).toBe('FFC00000')
    expect(hexToArgb('1f6feb')).toBe('FF1F6FEB')
    expect(hexToArgb('#f00')).toBe('FFFF0000')
  })
  it('rejects anything else', () => {
    expect(hexToArgb('red')).toBeUndefined()
    expect(hexToArgb('#12345')).toBeUndefined()
    expect(hexToArgb('')).toBeUndefined()
  })
})

describe('toExcelFont', () => {
  it('maps every style option to the ExcelJS font shape', () => {
    expect(
      toExcelFont({ bold: true, italic: true, underline: true, strike: true, color: '#C00000', size: 14, font: 'Arial', vertAlign: 'superscript' })
    ).toEqual({ bold: true, italic: true, underline: true, strike: true, color: { argb: 'FFC00000' }, size: 14, name: 'Arial', vertAlign: 'superscript' })
  })

  it('keeps the cell base font and lets the tag override it', () => {
    const base = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } }
    expect(toExcelFont({ bold: true, size: 16 }, base)).toEqual({ name: 'Calibri', size: 16, color: { argb: 'FF000000' }, bold: true })
    expect(base.size).toBe(11) // base is not changed
  })

  it('skips an invalid color', () => {
    expect(toExcelFont({ color: 'nope' })).toEqual({})
  })
})

describe('toExcelRichText', () => {
  it('produces the ExcelJS rich-text value for a converted cell', () => {
    const { runs } = htmlToRuns('<b>my name</b> is <i>pasindu</i>', { rules: DEFAULT_RULES, unknownTagAction: 'strip' })
    expect(toExcelRichText(runs)).toEqual({
      richText: [
        { text: 'my name', font: { bold: true } },
        { text: ' is ' },
        { text: 'pasindu', font: { italic: true } }
      ]
    })
  })

  it('applies the base font to unstyled runs too', () => {
    const { runs } = htmlToRuns('a<b>b</b>', { rules: DEFAULT_RULES, unknownTagAction: 'strip' })
    expect(toExcelRichText(runs, { name: 'Calibri', size: 11 }).richText).toEqual([
      { text: 'a', font: { name: 'Calibri', size: 11 } },
      { text: 'b', font: { name: 'Calibri', size: 11, bold: true } }
    ])
  })
})
