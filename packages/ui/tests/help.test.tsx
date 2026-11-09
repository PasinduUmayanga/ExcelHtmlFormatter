import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { linkTarget, parseInline, parseMarkdown, plainText, slug } from '../src/features/help/markdown'
import { helpSections, helpTopic, highlight, searchHelp, searchWords } from '../src/features/help/search'
import { Markdown, type RenderLink } from '../src/design/molecules/Markdown'

const renderLink: RenderLink = (target, children) => (
  <a data-topic={target.kind === 'topic' ? target.topic : ''} data-anchor={target.anchor ?? ''}>
    {children}
  </a>
)
const html = (md: string) => renderToStaticMarkup(<Markdown blocks={parseMarkdown(md)} renderLink={renderLink} />)

describe('Markdown parser', () => {
  it('reads headings, paragraphs, lists and code blocks', () => {
    const blocks = parseMarkdown(
      '# Title\n\nFirst line\nsame paragraph.\n\n## Saving files\n\n- one\n- two\n  continued\n\n1. a\n2. b\n\n```\n<b>raw</b>\n```\n### Small'
    )
    expect(blocks.map((b) => b.kind)).toEqual(['heading', 'paragraph', 'heading', 'list', 'list', 'code', 'heading'])
    expect(blocks[1]).toEqual({ kind: 'paragraph', inline: [{ kind: 'text', text: 'First line same paragraph.' }] })
    expect(blocks[2]).toMatchObject({ level: 2, id: 'saving-files', text: 'Saving files' })
    expect(blocks[3]).toMatchObject({ ordered: false })
    expect((blocks[3] as { items: unknown[] }).items.map((i) => plainText(i as never))).toEqual([
      'one',
      'two continued'
    ])
    expect(blocks[4]).toMatchObject({ ordered: true })
    expect(blocks[5]).toEqual({ kind: 'code', text: '<b>raw</b>' })
    expect(blocks[6]).toMatchObject({ level: 3 })
  })

  it('reads inline formatting and leaves unclosed markers as text', () => {
    expect(parseInline('**Save** the *new* _file_ with `Ctrl+S`')).toEqual([
      { kind: 'strong', children: [{ kind: 'text', text: 'Save' }] },
      { kind: 'text', text: ' the ' },
      { kind: 'em', children: [{ kind: 'text', text: 'new' }] },
      { kind: 'text', text: ' ' },
      { kind: 'em', children: [{ kind: 'text', text: 'file' }] },
      { kind: 'text', text: ' with ' },
      { kind: 'code', text: 'Ctrl+S' }
    ])
    expect(plainText(parseInline('2 * 3 and **open'))).toBe('2 * 3 and **open')
    expect(plainText(parseInline('snake_case_name and \\*stars\\*'))).toBe('snake_case_name and *stars*')
  })

  it('makes unique anchors', () => {
    expect(slug('Line breaks & wrap text!')).toBe('line-breaks-wrap-text')
    const ids = parseMarkdown('## Notes\n\n## Notes').map((b) => (b.kind === 'heading' ? b.id : ''))
    expect(ids).toEqual(['notes', 'notes-1'])
  })

  it('follows only links inside Help', () => {
    expect(linkTarget('user-guide.md#saving')).toEqual({ kind: 'topic', topic: 'user-guide', anchor: 'saving' })
    expect(linkTarget('./faq.md')).toEqual({ kind: 'topic', topic: 'faq', anchor: undefined })
    expect(linkTarget('#saving')).toEqual({ kind: 'anchor', anchor: 'saving' })
    for (const href of ['https://example.com', 'javascript:alert(1)', 'file:///c:/x', '../../etc/x.md']) {
      expect(linkTarget(href).kind).toBe('external')
    }
  })
})

describe('Markdown display', () => {
  it('draws the blocks as elements, with links inside Help handed to the screen', () => {
    expect(html('## A b\n\nSee [the guide](user-guide.md#saving).')).toBe(
      '<div class="markdown"><h2 id="a-b">A b</h2><p>See <a data-topic="user-guide" data-anchor="saving">the guide</a>.</p></div>'
    )
  })

  it('never turns text into HTML, and never makes web or script links clickable', () => {
    const out = html(
      '<script>alert(1)</script> <img src=x onerror=alert(1)>\n\n[click](javascript:alert(1)) [site](https://example.com)'
    )
    expect(out).not.toContain('<script')
    expect(out).not.toContain('<img')
    expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &lt;img src=x onerror=alert(1)&gt;')
    expect(out).not.toContain('href')
    expect(out).toContain('click <span class="ext-link">site (https://example.com)</span>')
  })
})

describe('Help search', () => {
  const topics = [
    helpTopic({
      id: 'user-guide',
      markdown: '# User guide\n\nHow to use it.\n\n## Line breaks\n\nCells are set to wrap text.'
    }),
    helpTopic({
      id: 'faq',
      markdown: '# FAQs\n\nQuestions.\n\n## Does it change my file?\n\nNo, it saves a new copy.'
    }),
    helpTopic({ id: 'plain', markdown: 'No title here.' })
  ]
  const sections = helpSections(topics)

  it('takes the title and summary from the Markdown', () => {
    expect(topics[0]).toMatchObject({ id: 'user-guide', title: 'User guide', summary: 'How to use it.' })
    expect(topics[2]).toMatchObject({ title: 'plain', summary: 'No title here.' })
    expect(sections.map((s) => s.heading)).toEqual([null, 'Line breaks', null, 'Does it change my file?', null])
  })

  it('finds sections with every word, best matches first', () => {
    const results = searchHelp(sections, 'Wrap')
    expect(results.map((r) => r.section.anchor)).toEqual(['line-breaks'])
    expect(results[0].excerpt).toBe('Cells are set to wrap text.')
    expect(searchHelp(sections, 'copy file').map((r) => r.section.heading)).toEqual(['Does it change my file?'])
    expect(searchHelp(sections, 'wrap copy')).toEqual([])
    expect(searchHelp(sections, ' ? ')).toEqual([])
  })

  it('shortens long excerpts around the match', () => {
    const long = helpSections([
      helpTopic({ id: 'x', markdown: `# X\n\n${'a '.repeat(200)}needle ${'b '.repeat(200)}` })
    ])
    const [result] = searchHelp(long, 'needle')
    expect(result.excerpt.startsWith('…')).toBe(true)
    expect(result.excerpt.endsWith('…')).toBe(true)
    expect(result.excerpt).toContain('needle')
  })

  it('splits words and marks matches for highlighting', () => {
    expect(searchWords('Wrap the wrap, a  b')).toEqual(['wrap', 'the'])
    expect(highlight('Set to Wrap text', ['wrap'])).toEqual([
      { text: 'Set to ', match: false },
      { text: 'Wrap', match: true },
      { text: ' text', match: false }
    ])
    // Special characters in a word are matched literally, not as a pattern.
    expect(highlight('a (b) ab', ['(b)'])).toEqual([
      { text: 'a ', match: false },
      { text: '(b)', match: true },
      { text: ' ab', match: false }
    ])
    expect(highlight('x', [])).toEqual([{ text: 'x', match: false }])
  })
})
