import { describe, expect, it } from 'vitest'
import { mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defaultConfig, type JobProgress } from '@hf/core'
import { excelAdapter, convertWorkbook, summarizeWorkbook, excelFormat } from '../src/index'
import { buildSampleWorkbook } from '../scripts/sampleWorkbook.mts'

describe('excelAdapter (the FormatAdapter for .xlsx)', () => {
  it('reads, summarises, previews, converts and writes a real file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ehf-'))
    const source = join(dir, 'in.xlsx')
    await buildSampleWorkbook().xlsx.writeFile(source)

    const doc = await excelAdapter.read(source)
    const summary = excelAdapter.summarize(doc, { path: source, name: 'in.xlsx', sizeBytes: 1 })
    expect(summary.sections.map((s) => s.name)).toEqual([
      'Products',
      'Team',
      'Science',
      'Formatting',
      'Summary',
      'Lookup'
    ])

    const preview = excelAdapter.preview(doc, 'Team')
    expect(preview.sheet).toBe('Team')
    expect(preview.rows[1][0]).toEqual({ text: '<b>my name</b> is <i>pasindu</i>', html: true })

    const stats = excelAdapter.convert(doc, ['Products', 'Team', 'Science'], defaultConfig())
    expect(stats.converted).toBe(27)
    await excelAdapter.write(doc, join(dir, 'out.xlsx'))
    expect(readdirSync(dir).sort()).toEqual(['in.xlsx', 'out.xlsx'])
  })

  it('reports a missing sheet clearly', () => {
    expect(() => excelAdapter.preview(buildSampleWorkbook(), 'Nope')).toThrow('That sheet no longer exists.')
  })

  it('describes the Excel format for the shared UI', () => {
    expect(excelFormat.fileTypes[0].extensions).toEqual(['xlsx'])
    expect(excelFormat.section).toEqual({ singular: 'sheet', plural: 'sheets' })
  })
})

describe('progress reporting', () => {
  it('reports converting progress in rows, up to 100%', () => {
    const updates: JobProgress[] = []
    convertWorkbook(buildSampleWorkbook(), ['Products', 'Team'], defaultConfig(), (p) => updates.push(p))
    expect(updates[0]).toMatchObject({ stage: 'converting', total: 14, unit: 'rows' })
    expect(updates[updates.length - 1]).toEqual({ stage: 'converting', done: 14, total: 14, unit: 'rows' })
  })

  it('reports each sheet while scanning', () => {
    const updates: JobProgress[] = []
    summarizeWorkbook(buildSampleWorkbook(), { path: 'x', name: 'x', sizeBytes: 0 }, (p) => updates.push(p))
    expect(updates.map((u) => [u.done, u.total, u.unit])).toEqual([
      [0, 6, 'sheets'],
      [1, 6, 'sheets'],
      [2, 6, 'sheets'],
      [3, 6, 'sheets'],
      [4, 6, 'sheets'],
      [5, 6, 'sheets']
    ])
  })
})
