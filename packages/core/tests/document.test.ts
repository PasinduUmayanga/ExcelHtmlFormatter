import { describe, expect, it } from 'vitest'
import { DEFAULT_RULES, htmlToRuns, layoutAsText, parseDocument, RULE_LINE, type ConvertOptions } from '../src'

const options: ConvertOptions = { rules: DEFAULT_RULES, unknownTagAction: 'strip' }
const convert = (html: string, extra: Partial<ConvertOptions> = {}) => htmlToRuns(html, { ...options, ...extra })
const text = (html: string) => convert(html).plainText

describe('lists', () => {
  it('bullets items, with a different bullet per level', () => {
    expect(text('<ul><li>One</li><li>Two<ul><li>Nested<ul><li>Deep</li></ul></li></ul></li></ul>')).toBe(
      '•  One\n•  Two\n   ◦  Nested\n      ▪  Deep'
    )
  })

  it('numbers ordered lists, honouring start, and closes unclosed items', () => {
    expect(text('Intro<ol start="3"><li>c<li>d</ol>after')).toBe('Intro\n3. c\n4. d\nafter')
    expect(text('<ol start="x"><li>a</li></ol>')).toBe('1. a')
  })

  it('marks bullets and numbers as layout, not content', () => {
    expect(convert('<ol><li>a</li></ol>').runs).toEqual([
      { text: '1. ', style: {}, layout: true },
      { text: 'a', style: {} }
    ])
  })

  it('lines up wrapped lines of an item under its text', () => {
    expect(text('<ul><li>a<br>b</li></ul>')).toBe('•  a\n   b')
  })

  it('attaches a list placed directly inside a list to the previous item', () => {
    expect(text('<ul><li>a</li><ul><li>b</li></ul></ul>')).toBe('•  a\n   ◦  b')
  })

  it('keeps loose text in a list as an item, and treats a lone <li> as a list', () => {
    expect(text('<ul>loose<li>a</li></ul>')).toBe('•  loose\n•  a')
    expect(text('<li>lone</li>')).toBe('•  lone')
  })

  it('ignores source whitespace inside lists', () => {
    expect(text('<ul>\n  <li> spaced   out </li>\n</ul>')).toBe('•  spaced out')
  })

  it('styles list content from the tags around it', () => {
    expect(convert('<b><ul><li>x</li></ul></b>').runs).toEqual([
      { text: '•  ', style: {}, layout: true },
      { text: 'x', style: { bold: true } }
    ])
  })
})

describe('blocks', () => {
  it('puts headings on their own line with their default look', () => {
    expect(convert('<h1>Title</h1>text').runs).toEqual([
      { text: 'Title', style: { bold: true, size: 18 } },
      { text: '\ntext', style: {} }
    ])
    const sizes = { h2: 16, h3: 14, h4: 13, h5: 12, h6: 11 }
    for (const [tag, size] of Object.entries(sizes)) {
      expect(convert(`<${tag}>x</${tag}>`).runs[0].style).toEqual({ bold: true, size })
    }
  })

  it('keeps the original paragraph behaviour: no empty first line, no doubled breaks', () => {
    expect(text('<p>a</p><p>b</p>')).toBe('a\nb')
    expect(text('<p></p><p>a</p>')).toBe('a')
    expect(text('a<br><p>b</p>')).toBe('a\nb')
  })

  it('indents quotes, on every line', () => {
    expect(convert('<blockquote>quoted\ntext</blockquote>').runs).toEqual([
      { text: '    ', style: {}, layout: true },
      { text: 'quoted text', style: { italic: true } }
    ])
    expect(text('<blockquote>a<br>b</blockquote>')).toBe('    a\n    b')
    expect(text('<blockquote><ul><li>x</li></ul></blockquote>')).toBe('    •  x')
  })

  it('keeps preformatted text exactly, in a fixed-width font', () => {
    expect(convert('<pre>  a\n  b</pre>').runs).toEqual([{ text: '  a\n  b', style: { font: 'Consolas' } }])
    expect(text('<ul><li><pre>a  b</pre></li></ul>')).toBe('•  a  b')
  })

  it('draws <hr> as a line of its own', () => {
    expect(text('a<hr>b')).toBe(`a\n${RULE_LINE}\nb`)
    expect(text('<hr>b')).toBe(`${RULE_LINE}\nb`)
    expect(convert('<hr/>').runs).toEqual([{ text: RULE_LINE, style: {}, layout: true }])
  })
})

describe('tables', () => {
  it('puts rows on their own lines, with separators between cells', () => {
    expect(convert('<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>').runs).toEqual([
      { text: 'A', style: { bold: true } },
      { text: ' │ ', style: {}, layout: true },
      { text: 'B', style: { bold: true } },
      { text: '\n1', style: {} },
      { text: ' │ ', style: {}, layout: true },
      { text: '2', style: {} }
    ])
  })

  it('handles sections, captions, unclosed cells and colgroups', () => {
    const html =
      '<table><caption>Prices</caption><colgroup><col></colgroup><thead><tr><th>Item<th>Cost</thead>' +
      '<tbody><tr><td>Tea<td>2</tbody><tfoot><tr><td>Total<td>2</tfoot></table>'
    expect(text(html)).toBe('Prices\nItem │ Cost\nTea │ 2\nTotal │ 2')
  })

  it('keeps a cell on one line, turning breaks and blocks into spaces', () => {
    expect(text('<table><tr><td>a<br>b</td><td><p>c</p><p>d</p></td></tr></table>')).toBe('a b │ c d')
    expect(text('<table><tr><td><ul><li>x</li><li>y</li></ul></td></tr></table>')).toBe('•  x •  y')
    expect(text('<table><tr><td>A</td><td><ol><li>x</li><li>y</li></ol></td></tr></table>')).toBe('A │ 1. x 2. y')
  })

  it('accepts stray table parts and loose text', () => {
    expect(text('<td>stray</td>')).toBe('stray')
    expect(text('<tr><td>a</td><td>b</td></tr>')).toBe('a │ b')
    expect(text('<table>loose<tr><td>a</td></tr></table>')).toBe('loose\na')
    expect(text('<table><tr><b>x</b></tr></table>')).toBe('x')
  })
})

describe('inline tags', () => {
  it('applies the built-in look of the formatting tags', () => {
    expect(convert('<code>x()</code><s>o</s><del>g</del><strong>S</strong><em>E</em><u>U</u>').runs).toEqual([
      { text: 'x()', style: { font: 'Consolas' } },
      { text: 'og', style: { strike: true } },
      { text: 'S', style: { bold: true } },
      { text: 'E', style: { italic: true } },
      { text: 'U', style: { underline: true } }
    ])
    expect(convert('H<sub>2</sub>O x<sup>2</sup>').runs.map((r) => r.style.vertAlign)).toEqual([
      undefined,
      'subscript',
      undefined,
      'superscript'
    ])
  })

  it('lets a settings rule replace a built-in look', () => {
    const rules = { ...DEFAULT_RULES, h1: { italic: true } }
    expect(convert('<h1>x</h1>', { rules }).runs).toEqual([{ text: 'x', style: { italic: true } }])
  })

  it('applies inline styles on top of the tag look', () => {
    expect(convert('<span style="color:red;font-weight:bold">r</span>').runs).toEqual([
      { text: 'r', style: { color: '#FF0000', bold: true } }
    ])
    expect(convert('<b style="font-weight:normal">n</b>').runs).toEqual([{ text: 'n', style: {} }])
  })

  it('highlights <mark> and background colours, and reports a fully highlighted cell', () => {
    const all = convert('<mark>all</mark> ')
    expect(all.runs[0]).toEqual({ text: 'all', style: { bold: true, color: '#B45309' }, highlight: true })
    expect(all.fullyHighlighted).toBe(true)
    expect(convert('x <mark>part</mark>').fullyHighlighted).toBe(false)
    expect(convert('<span style="background:yellow">y</span>').fullyHighlighted).toBe(true)
    expect(convert('<mark><span style="background:white">no</span></mark>').fullyHighlighted).toBe(false)
    expect(convert('').fullyHighlighted).toBe(false)
  })
})

describe('links', () => {
  it('uses the first safe link for the cell and reports the others', () => {
    const r = convert(
      '<a href="javascript:alert(1)">bad</a> <a href="https://x.com">site</a> <a href="https://y.com">y</a>'
    )
    expect(r.plainText).toBe('bad site y')
    expect(r.cellLink).toBe('https://x.com/')
    expect(r.skippedLinks).toEqual([
      { href: 'javascript:alert(1)', text: 'bad', reason: 'unsafe' },
      { href: 'https://y.com', text: 'y', reason: 'extra' }
    ])
    expect(r.runs[2]).toEqual({ text: 'site', style: { color: '#0563C1', underline: true }, link: 1 })
  })

  it('has no cell link when no link is safe, and ignores <a> without href', () => {
    const r = convert('<a href="file:///c:/x">f</a><a name="top">t</a>')
    expect(r.cellLink).toBeUndefined()
    expect(r.links).toHaveLength(1)
    expect(r.skippedLinks[0].reason).toBe('unsafe')
    expect(r.runs[1]).toEqual({ text: 't', style: { color: '#0563C1', underline: true } })
  })
})

describe('unknown and odd tags', () => {
  it('never mistakes inherited object names for tags or rules', () => {
    const r = convert('<constructor>c</constructor><toString>t</toString><valueOf>v</valueOf>')
    expect(r.plainText).toBe('ctv')
    expect(r.unknownTags).toEqual(['constructor', 'tostring', 'valueof'])
  })

  it('keeps unknown tags around structure when asked', () => {
    expect(convert('<x><ul><li>a</li></ul></x>', { unknownTagAction: 'keep' }).plainText).toBe('<x>\n•  a\n</x>')
    expect(convert('a</x>b', { unknownTagAction: 'keep' }).plainText).toBe('a</x>b')
    expect(convert('a</x>b').plainText).toBe('ab')
    const kept = convert('<a href="https://a.b">x</y>z</a>', { unknownTagAction: 'keep' })
    expect(kept.plainText).toBe('x</y>z')
    expect(kept.links[0].text).toBe('xz')
  })

  it('treats a stray </br> as a line break and skips comments', () => {
    expect(text('a</br>b<!-- c -->d')).toBe('a\nbd')
  })
})

describe('parseDocument and layoutAsText', () => {
  it('produce the block structure used by other writers', () => {
    const doc = parseDocument('<h2>T</h2><ol><li>a</li></ol><hr><blockquote>q</blockquote>', options)
    expect(doc.blocks.map((b) => b.type)).toEqual(['paragraph', 'list', 'rule', 'quote'])
    expect(layoutAsText(doc.blocks).plainText).toBe(`T\n1. a\n${RULE_LINE}\n    q`)
  })

  it('never throws on random input', () => {
    let seed = 7
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31
      return seed % n
    }
    const parts = ['<ul>', '</ul>', '<li>', '</li>', '<table>', '<tr>', '<td>', '</td>', '<b>', '</i>', '<p>', 'x']
    parts.push(' ', '\n', '<br>', '<hr>', '<a href="https://a.b">', '</a>', '<pre>', '</table>', '<mark>', '<')
    for (let i = 0; i < 500; i++) {
      const html = Array.from({ length: rand(30) }, () => parts[rand(parts.length)]).join('')
      expect(() => convert(html)).not.toThrow()
    }
  })
})
