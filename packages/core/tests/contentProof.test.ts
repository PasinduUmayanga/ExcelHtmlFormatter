import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RULES,
  diffWords,
  htmlToRuns,
  MAX_CELL_TEXT,
  proveContent,
  type ConvertOptions,
  type ConvertResult
} from '../src'

const options: ConvertOptions = { rules: DEFAULT_RULES, unknownTagAction: 'strip' }
const prove = (html: string, extra: Partial<ConvertOptions> = {}) => {
  const opts = { ...options, ...extra }
  return proveContent(html, htmlToRuns(html, opts), opts)
}
/** A converter result with some text changed, to prove that the proof catches it */
const tampered = (html: string, change: (text: string) => string): ConvertResult => {
  const result = htmlToRuns(html, options)
  const runs = result.runs.map((run) => (run.layout ? run : { ...run, text: change(run.text) }))
  return { ...result, runs, plainText: runs.map((r) => r.text).join('') }
}

describe('diffWords', () => {
  it('finds removed and added words in order', () => {
    expect(diffWords(['a', 'b', 'c', 'd'], ['a', 'c', 'x', 'd'])).toEqual([
      { op: 'same', items: ['a'] },
      { op: 'removed', items: ['b'] },
      { op: 'same', items: ['c'] },
      { op: 'added', items: ['x'] },
      { op: 'same', items: ['d'] }
    ])
    expect(diffWords([], [])).toEqual([])
    expect(diffWords(['a'], [])).toEqual([{ op: 'removed', items: ['a'] }])
    expect(diffWords([], ['a'])).toEqual([{ op: 'added', items: ['a'] }])
  })

  it('notices a moved word', () => {
    const parts = diffWords(['a', 'b', 'c'], ['c', 'a', 'b'])!
    expect(parts.filter((p) => p.op !== 'same').flatMap((p) => p.items)).toEqual(['c', 'c'])
  })

  it('gives up beyond the edit limit', () => {
    expect(diffWords(['a', 'b', 'c'], ['x', 'y', 'z'], 2)).toBeNull()
    expect(diffWords(['a', 'b', 'c'], ['x', 'y', 'z'], 6)).not.toBeNull()
  })

  it('agrees with a brute-force edit distance on random lists', () => {
    let seed = 11
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31
      return seed % n
    }
    const lcs = (a: string[], b: string[]) => {
      const t = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
      for (let i = 1; i <= a.length; i++)
        for (let j = 1; j <= b.length; j++)
          t[i][j] = a[i - 1] === b[j - 1] ? t[i - 1][j - 1] + 1 : Math.max(t[i - 1][j], t[i][j - 1])
      return t[a.length][b.length]
    }
    for (let i = 0; i < 300; i++) {
      const a = Array.from({ length: rand(12) }, () => 'abcd'[rand(4)])
      const b = Array.from({ length: rand(12) }, () => 'abcd'[rand(4)])
      const parts = diffWords(a, b)!
      const same = parts.filter((p) => p.op === 'same').flatMap((p) => p.items)
      expect(same.length).toBe(lcs(a, b))
      expect(parts.filter((p) => p.op !== 'added').flatMap((p) => p.items)).toEqual(a)
      expect(parts.filter((p) => p.op !== 'removed').flatMap((p) => p.items)).toEqual(b)
    }
  })
})

describe('proveContent', () => {
  it('passes every supported tag, ignoring the layout the converter adds', () => {
    const html =
      '<h1>Title</h1><p>Some <b>bold</b> and <i>italic</i> text.</p>' +
      '<ul><li>One</li><li>Two<ol><li>Nested</li></ol></li></ul>' +
      '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>' +
      '<blockquote>Quote</blockquote><hr>H<sub>2</sub>O &amp; x<sup>2</sup> <mark>m</mark> <code>c()</code>' +
      '<a href="https://example.com">link</a><br>end'
    const proof = prove(html)
    expect(proof).toMatchObject({ status: 'complete', missing: [], added: [], spacing: [], overLimit: 0 })
  })

  it('does not split words joined by inline tags', () => {
    expect(prove('un<b>bold</b>ed').status).toBe('complete')
  })

  it('reports missing words with their place', () => {
    const html = '<p>one two three four five six</p>'
    const result = tampered(html, (t) => t.replace('four ', ''))
    expect(proveContent(html, result, options)).toMatchObject({
      status: 'missing',
      missing: [{ text: 'four', before: 'one two three', after: 'five six' }],
      added: []
    })
  })

  it('reports words that were not in the source', () => {
    const result = tampered('a b', (t) => t.replace('b', 'b c'))
    expect(proveContent('a b', result, options)).toMatchObject({
      status: 'changed',
      added: [{ text: 'c', before: 'a b', after: '' }]
    })
  })

  it('counts unknown tags kept as text as content', () => {
    expect(prove('a <x>b</x> c', { unknownTagAction: 'keep' }).status).toBe('complete')
    expect(prove('a <x>b</x> c').status).toBe('complete')
  })

  it('checks the spacing inside <pre>', () => {
    expect(prove('<pre>a  b\n c   d</pre>').status).toBe('complete')
    expect(prove('<pre>x<br>a  b</pre>').status).toBe('complete')
    expect(prove('<pre>open  ended').status).toBe('complete')
    const html = '<pre>a  b</pre>'
    const proof = proveContent(
      html,
      tampered(html, (t) => t.replace('a  b', 'a b')),
      options
    )
    expect(proof).toMatchObject({ status: 'missing', missing: [], spacing: ['a  b'] })
  })

  it('reports text longer than an Excel cell', () => {
    const proof = prove('x'.repeat(MAX_CELL_TEXT + 5))
    expect(proof).toMatchObject({ status: 'limit', overLimit: 5 })
  })

  it('notes comments, image text and links that were not used', () => {
    const html = 'a<!-- hidden --><img alt=" Logo "><img src="x"><a href="javascript:x">b</a>'
    expect(prove(html).notes).toEqual([
      { kind: 'comment', count: 1 },
      { kind: 'image', alt: 'Logo' },
      { kind: 'link', href: 'javascript:x', text: 'b', reason: 'unsafe' }
    ])
  })

  it('falls back to comparing word counts when the texts are too different', () => {
    const html = Array.from({ length: 3000 }, (_, i) => `w${i}`).join(' ')
    const result = tampered(html, (t) => t.replace(/w(\d+)/g, 'v$1'))
    const proof = proveContent(html, result, options)
    expect(proof.status).toBe('missing')
    expect(proof.notes).toContainEqual({ kind: 'approximate' })
    expect(proof.missing).toHaveLength(3000)
    expect(proof.added).toHaveLength(3000)
  })

  it('passes on random HTML (property test)', () => {
    let seed = 3
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31
      return seed % n
    }
    const tags = ['b', 'i', 'u', 's', 'p', 'h2', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'blockquote', 'code']
    tags.push('mark', 'span', 'sup', 'sub', 'a', 'pre', 'x', 'thead', 'caption')
    const piece = () => {
      const r = rand(10)
      if (r < 4) return ['alpha', 'beta', 'gamma', 'd&amp;e', 'one two', '\n', '  '][rand(7)]
      if (r < 5) return ['<br>', '<hr>', '</br>', '<!--c-->'][rand(4)]
      const tag = tags[rand(tags.length)]
      return rand(2) ? `<${tag}${tag === 'a' ? ' href="https://a.b"' : ''}>` : `</${tag}>`
    }
    for (let i = 0; i < 3000; i++) {
      const html = Array.from({ length: rand(40) }, piece).join('')
      for (const unknownTagAction of ['strip', 'keep'] as const) {
        const proof = prove(html, { unknownTagAction })
        expect({ html, unknownTagAction, missing: proof.missing, added: proof.added }).toEqual({
          html,
          unknownTagAction,
          missing: [],
          added: []
        })
      }
    }
  })
})
