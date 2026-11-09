import { describe, expect, it } from 'vitest'
import { DEFAULT_RULES, htmlToRuns } from '@hf/core'
import { linkTitle } from '../src/design/molecules/RichText'

const convert = (html: string) => htmlToRuns(html, { rules: DEFAULT_RULES, unknownTagAction: 'strip' })

describe('linkTitle (preview tooltips)', () => {
  it('names the address of the cell link, and why other links are not added', () => {
    const r = convert(
      '<a href="javascript:x">a</a><a href="https://x.example">b</a><a href="https://y.example">c</a><a href="//bad">d</a>'
    )
    expect(r.links.map((_, i) => linkTitle(r, i))).toEqual([
      'Not linked (unsafe address): javascript:x',
      'Link: https://x.example/',
      'Not linked (a cell can have only one link): https://y.example',
      'Not linked (not a valid address): //bad'
    ])
    expect(linkTitle(r, undefined)).toBeUndefined()
    expect(linkTitle(r, 9)).toBeUndefined()
  })

  it('treats a repeat of the cell link address as a second link', () => {
    const r = convert('<a href="https://x.example">1</a><a href="https://x.example">2</a>')
    expect(linkTitle(r, 1)).toBe('Not linked (a cell can have only one link): https://x.example')
  })
})

describe('clip (long HTML on the compare screen)', async () => {
  const { clip, MAX_SHOWN_HTML } = await import('../src/design/organisms/CheckDetail')
  it('keeps short text and shortens long text, saying how much is left out', () => {
    expect(clip('short')).toBe('short')
    expect(clip('x'.repeat(MAX_SHOWN_HTML + 1234))).toBe(`${'x'.repeat(MAX_SHOWN_HTML)}… (1,234 more characters)`)
  })
})
