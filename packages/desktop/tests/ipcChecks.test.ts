import { describe, expect, it } from 'vitest'
import { MAX_REPORT_CHARS, outputFileName, reportText, sectionList, unreadableSave } from '../src/main/ipcChecks'

describe('IPC argument checks', () => {
  it('accepts a non-empty list of section names only', () => {
    expect(sectionList(['A', 'B'], 'sheets')).toEqual(['A', 'B'])
    for (const bad of [[], 'A', null, [1], ['A', 2], { 0: 'A' }]) {
      expect(() => sectionList(bad, 'sheets')).toThrow('No sheets were selected.')
    }
  })

  it('accepts a report only as text of a sane size', () => {
    expect(reportText('a,b\r\n')).toBe('a,b\r\n')
    for (const bad of [null, 5, { csv: 'x' }, 'x'.repeat(MAX_REPORT_CHARS + 1)]) {
      expect(() => reportText(bad)).toThrow('The report could not be saved.')
    }
  })

  it('reports a saved file that could not be read back as one difference', () => {
    expect(unreadableSave('disk gone')).toMatchObject({
      compared: 0,
      differences: 1,
      items: [
        { kind: 'saved', severity: 'issue', saved: 'The saved file could not be read back to check it: disk gone' }
      ]
    })
  })
})

describe('outputFileName (Export screen name for the Save dialog)', () => {
  it('keeps a typed name and adds the extension once', () => {
    expect(outputFileName('Report final', 'x_formatted', 'xlsx')).toBe('Report final.xlsx')
    expect(outputFileName('Report.XLSX', 'x_formatted', 'xlsx')).toBe('Report.xlsx')
  })

  it('keeps only a name: no folders, no characters files cannot have', () => {
    expect(outputFileName('C:\\Windows\\evil', 'x', 'xlsx')).toBe('evil.xlsx')
    expect(outputFileName('../../up/a:b*c?.xlsx', 'x', 'xlsx')).toBe('abc.xlsx')
    expect(outputFileName('name. . ', 'x', 'xlsx')).toBe('name.xlsx')
  })

  it('falls back to the usual name when nothing usable was typed', () => {
    for (const bad of [undefined, 42, '', '   ', '<>|', '.xlsx']) {
      expect(outputFileName(bad, 'catalog_formatted', 'xlsx')).toBe('catalog_formatted.xlsx')
    }
  })
})
