import { describe, expect, it } from 'vitest'
import {
  contentDiff,
  DEFAULT_RULES,
  describeCheckItem,
  htmlToRuns,
  proveContent,
  ReportBuilder,
  reportToCsv,
  type CheckItem,
  type ConvertOptions,
  type ConvertResult
} from '../src'

const options: ConvertOptions = { rules: DEFAULT_RULES, unknownTagAction: 'strip' }

function addCell(builder: ReportBuilder, location: string, html: string, change?: (t: string) => string) {
  let result: ConvertResult = htmlToRuns(html, options)
  if (change) {
    const runs = result.runs.map((r) => ({ ...r, text: change(r.text) }))
    result = { ...result, runs, plainText: runs.map((r) => r.text).join('') }
  }
  builder.add('Sheet', location, html, result, proveContent(html, result, options))
}

describe('ReportBuilder', () => {
  it('counts every cell and lists issues before notes', () => {
    const builder = new ReportBuilder()
    addCell(builder, 'A1', '<b>fine</b>')
    addCell(builder, 'A2', '<a href="javascript:x">note</a>')
    addCell(builder, 'A3', '<i>one two</i>', (t) => t.replace(' two', ''))
    const report = builder.build()
    expect(report).toMatchObject({ checked: 3, complete: 2, issues: 1, notes: 1, truncated: false })
    expect(report.items.map((i) => [i.location, i.severity, i.kind])).toEqual([
      ['A3', 'issue', 'missing'],
      ['A2', 'note', 'note']
    ])
    expect(report.items[0]).toMatchObject({ section: 'Sheet', source: '<i>one two</i>', converted: 'one' })
  })

  it('stops listing at its limit but keeps counting', () => {
    const builder = new ReportBuilder(2)
    for (const n of [1, 2, 3]) addCell(builder, `A${n}`, '<b>a b</b>', (t) => t.replace(' b', ''))
    expect(builder.build()).toMatchObject({ checked: 3, issues: 3, truncated: true })
    expect(builder.build().items).toHaveLength(2)
  })

  it('names spacing and added-text issues', () => {
    const builder = new ReportBuilder()
    addCell(builder, 'A1', '<pre>a  b</pre>', (t) => t.replace('a  b', 'a b'))
    addCell(builder, 'A2', 'x', (t) => t + ' extra')
    expect(builder.build().items.map((i) => i.kind)).toEqual(['spacing', 'changed'])
  })
})

describe('describeCheckItem', () => {
  const item = (patch: Partial<CheckItem>): CheckItem => ({
    section: 'S',
    location: 'A1',
    severity: 'issue',
    kind: 'note',
    source: '',
    converted: '',
    ...patch
  })
  const proof = (patch: Partial<NonNullable<CheckItem['proof']>>) => ({
    status: 'complete' as const,
    missing: [],
    added: [],
    spacing: [],
    overLimit: 0,
    notes: [],
    ...patch
  })

  it('describes every kind in plain words', () => {
    const gap = { text: 'lost words', before: '', after: '' }
    expect(describeCheckItem(item({ kind: 'missing', proof: proof({ missing: [gap] }) }))).toBe(
      'Missing text: "lost words"'
    )
    expect(describeCheckItem(item({ kind: 'spacing', proof: proof({ spacing: ['a  b'] }) }))).toBe(
      'Spacing changed in preformatted text: "a  b"'
    )
    expect(describeCheckItem(item({ kind: 'changed', proof: proof({ added: [gap] }) }))).toBe(
      'Text not in the original: "lost words"'
    )
    expect(describeCheckItem(item({ kind: 'limit', proof: proof({ overLimit: 1234 }) }))).toBe(
      'Too long for one cell: 1,234 characters over the 32,767 limit'
    )
    expect(describeCheckItem(item({ kind: 'saved' }))).toBe('The saved file does not contain the converted text')
    expect(describeCheckItem(item({ kind: 'untouched' }))).toBe('Changed in the saved file, but should not have been')
  })

  it('describes notes', () => {
    const notes = [
      { kind: 'comment' as const, count: 1 },
      { kind: 'comment' as const, count: 2 },
      { kind: 'image' as const, alt: 'Logo' },
      { kind: 'link' as const, href: 'https://b', text: 'b', reason: 'extra' },
      { kind: 'link' as const, href: 'x:y', text: 'y', reason: 'unsafe' },
      { kind: 'link' as const, href: 'https://l', text: 'l', reason: 'too-long' },
      { kind: 'link' as const, href: '//x', text: 'x', reason: 'invalid' },
      { kind: 'approximate' as const }
    ]
    expect(describeCheckItem(item({ proof: proof({ notes }) })).split('; ')).toEqual([
      'An HTML comment was removed',
      '2 HTML comments were removed',
      'An image was left out (its text: "Logo")',
      'Link not added (a cell can have only one): https://b',
      'Link not added (unsafe address): x:y',
      'Link not added (address too long): https://l',
      'Link not added (not a valid address): //x',
      'The texts were too different to compare word by word'
    ])
    expect(describeCheckItem(item({}))).toBe('')
  })
})

describe('reportToCsv', () => {
  it('writes an Excel-friendly CSV that cannot run formulas', () => {
    const csv = reportToCsv([
      {
        section: 'Q1, "draft"',
        location: 'A1',
        severity: 'issue',
        kind: 'saved',
        source: '=HYPERLINK("http://evil")',
        converted: 'two\nlines',
        saved: '@SUM(1)'
      }
    ])
    expect(csv.startsWith('﻿Sheet,Cell,Severity,Kind,Description,Original,Converted,Saved\r\n')).toBe(true)
    expect(csv).toContain('"Q1, ""draft"""')
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`)
    expect(csv).toContain('"two\nlines"')
    expect(csv).toContain(",'@SUM(1)\r\n")
  })
})

describe('contentDiff', () => {
  it('shows which source words are missing from the result', () => {
    const html = '<ul><li>one two</li><li>three</li></ul>'
    const result = htmlToRuns(html, options)
    expect(contentDiff(html, result, options)).toEqual([{ op: 'same', items: ['one', 'two', 'three'] }])
    const broken = { ...result, runs: result.runs.map((r) => ({ ...r, text: r.text.replace('two', '') })) }
    expect(contentDiff(html, broken, options)).toEqual([
      { op: 'same', items: ['one'] },
      { op: 'removed', items: ['two'] },
      { op: 'same', items: ['three'] }
    ])
  })
})

describe('describeCheckItem without a proof', () => {
  it('still describes the item (never throws while building a report)', () => {
    const bare = (kind: CheckItem['kind']): CheckItem => ({
      section: 'S',
      location: 'A1',
      severity: 'issue',
      kind,
      source: '',
      converted: ''
    })
    expect(describeCheckItem(bare('limit'))).toBe('Too long for one cell: 0 characters over the 32,767 limit')
    expect(describeCheckItem(bare('missing'))).toBe('Missing text: ')
    expect(reportToCsv(['missing', 'spacing', 'changed', 'limit'].map((k) => bare(k as CheckItem['kind'])))).toContain(
      'S,A1,issue,changed,Text not in the original: '
    )
  })
})
