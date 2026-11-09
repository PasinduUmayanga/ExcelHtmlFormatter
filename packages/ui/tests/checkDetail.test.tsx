import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DEFAULT_RULES, type CheckItem } from '@hf/core'
import { CheckDetail } from '../src/screens/CheckReview'

const options = { rules: DEFAULT_RULES, unknownTagAction: 'strip' as const }
const item = (patch: Partial<CheckItem>): CheckItem => ({
  section: 'S',
  location: 'B4',
  severity: 'issue',
  kind: 'missing',
  source: '<ul><li>one <script>alert(1)</script></li></ul>',
  converted: '•  one alert(1)',
  ...patch
})

describe('CheckDetail (compare view)', () => {
  it('shows the original, the converted text with layout marked, and never renders cell text as HTML', () => {
    const html = renderToStaticMarkup(<CheckDetail item={item({ kind: 'note' })} options={options} />)
    expect(html).toContain('&lt;ul&gt;&lt;li&gt;one &lt;script&gt;')
    expect(html).not.toContain('<script>')
    expect(html).toContain('<span class="layout"')
    expect(html).toContain('Original text')
  })

  it('marks what the saved file lost or gained', () => {
    const html = renderToStaticMarkup(
      <CheckDetail
        item={item({ kind: 'saved', source: '<b>a b c</b>', converted: 'a b c', saved: 'a c d' })}
        options={options}
      />
    )
    expect(html).toContain('<del>b </del>')
    expect(html).toContain('<ins>d </ins>')
    expect(html).toContain('In the saved file')
  })

  it('shows the original value of a cell that should not have changed', () => {
    const html = renderToStaticMarkup(
      <CheckDetail item={item({ kind: 'untouched', source: '5', converted: '5', saved: '6' })} options={options} />
    )
    expect(html).toContain('Original value')
    expect(html).not.toContain('Original HTML')
  })

  it('lists words that are not in the original', () => {
    const proof = {
      status: 'changed' as const,
      missing: [],
      added: [{ text: 'extra', before: '', after: '' }],
      spacing: [],
      overLimit: 0,
      notes: []
    }
    const html = renderToStaticMarkup(
      <CheckDetail item={item({ kind: 'changed', source: 'a', converted: 'a extra', proof })} options={options} />
    )
    expect(html).toContain('Not in the original:')
    expect(html).toContain('<ins>extra </ins>')
  })
})
