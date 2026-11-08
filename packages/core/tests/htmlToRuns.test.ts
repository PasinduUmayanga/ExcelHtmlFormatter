import { describe, expect, it } from 'vitest'
import { htmlToRuns, type ConvertOptions } from '../src/htmlToRuns'
import { DEFAULT_RULES } from '../src/defaultRules'

const opts = (extra: Partial<ConvertOptions> = {}): ConvertOptions => ({
  rules: DEFAULT_RULES,
  unknownTagAction: 'strip',
  ...extra
})
const convert = (html: string, extra?: Partial<ConvertOptions>) => htmlToRuns(html, opts(extra))

describe('htmlToRuns: basics', () => {
  it('converts the example from the brief', () => {
    expect(convert('<b>my name</b> is <i>pasindu</i>').runs).toEqual([
      { text: 'my name', style: { bold: true } },
      { text: ' is ', style: {} },
      { text: 'pasindu', style: { italic: true } }
    ])
  })

  it('leaves plain text as one unstyled run', () => {
    const r = convert('just text')
    expect(r.runs).toEqual([{ text: 'just text', style: {} }])
    expect(r.hasLineBreak).toBe(false)
    expect(r.unknownTags).toEqual([])
  })

  it('returns no runs for an empty string', () => {
    expect(convert('').runs).toEqual([])
  })

  it('is case-insensitive for tag names', () => {
    expect(convert('<B>x</B>').runs).toEqual([{ text: 'x', style: { bold: true } }])
  })

  it('ignores attributes, including quoted ">"', () => {
    expect(convert('<b class="a" title="x > y">bold</b>').runs).toEqual([{ text: 'bold', style: { bold: true } }])
  })

  it('treats strong/em the same as b/i by default', () => {
    expect(convert('<strong>a</strong><em>b</em>').runs).toEqual([
      { text: 'a', style: { bold: true } },
      { text: 'b', style: { italic: true } }
    ])
  })

  it('applies superscript and subscript', () => {
    expect(convert('H<sub>2</sub>O and E=mc<sup>2</sup>').runs).toEqual([
      { text: 'H', style: {} },
      { text: '2', style: { vertAlign: 'subscript' } },
      { text: 'O and E=mc', style: {} },
      { text: '2', style: { vertAlign: 'superscript' } }
    ])
  })

  it('applies custom rules with color, size and font', () => {
    const rules = { ...DEFAULT_RULES, mark: { bold: true, color: '#C00000', size: 14, font: 'Arial' } }
    expect(convert('<mark>hot</mark>', { rules }).runs).toEqual([
      { text: 'hot', style: { bold: true, color: '#C00000', size: 14, font: 'Arial' } }
    ])
  })
})

describe('htmlToRuns: nesting and broken HTML', () => {
  it('combines nested tags', () => {
    expect(convert('<b>bold <i>both</i> bold</b>').runs).toEqual([
      { text: 'bold ', style: { bold: true } },
      { text: 'both', style: { bold: true, italic: true } },
      { text: ' bold', style: { bold: true } }
    ])
  })

  it('lets an inner rule override an outer one', () => {
    const rules = { red: { color: '#FF0000' }, blue: { color: '#0000FF' } }
    expect(convert('<red>r<blue>b</blue>r</red>', { rules }).runs).toEqual([
      { text: 'r', style: { color: '#FF0000' } },
      { text: 'b', style: { color: '#0000FF' } },
      { text: 'r', style: { color: '#FF0000' } }
    ])
  })

  it('keeps styling to the end when a tag is never closed', () => {
    expect(convert('<b>never closed').runs).toEqual([{ text: 'never closed', style: { bold: true } }])
  })

  it('ignores a closing tag that was never opened', () => {
    expect(convert('a</b>b').runs).toEqual([{ text: 'ab', style: {} }])
  })

  it('closing an outer tag also closes unclosed inner tags', () => {
    expect(convert('<b>x<i>y</b>z').runs).toEqual([
      { text: 'x', style: { bold: true } },
      { text: 'y', style: { bold: true, italic: true } },
      { text: 'z', style: {} }
    ])
  })

  it('handles the same tag nested twice', () => {
    expect(convert('<b>a<b>b</b>c</b>d').runs).toEqual([
      { text: 'abc', style: { bold: true } },
      { text: 'd', style: {} }
    ])
  })

  it('merges neighbouring runs with the same style', () => {
    expect(convert('<b>a</b><b>b</b>').runs).toEqual([{ text: 'ab', style: { bold: true } }])
  })

  it('keeps a "<" that is not a tag as text', () => {
    expect(convert('x < 5 and <b>y</b> > 3').runs).toEqual([
      { text: 'x < 5 and ', style: {} },
      { text: 'y', style: { bold: true } },
      { text: ' > 3', style: {} }
    ])
  })

  it('drops HTML comments', () => {
    expect(convert('a<!-- note <b> -->b').runs).toEqual([{ text: 'ab', style: {} }])
  })

  it('ignores self-closing styled tags', () => {
    expect(convert('a<b/>b').runs).toEqual([{ text: 'ab', style: {} }])
  })
})

describe('htmlToRuns: line breaks', () => {
  it('turns <br> variants into line breaks', () => {
    const r = convert('a<br>b<br/>c<BR />d')
    expect(r.plainText).toBe('a\nb\nc\nd')
    expect(r.hasLineBreak).toBe(true)
  })

  it('keeps consecutive <br> as blank lines', () => {
    expect(convert('a<br><br>b').plainText).toBe('a\n\nb')
  })

  it('treats a stray </br> as a line break', () => {
    expect(convert('a</br>b').plainText).toBe('a\nb')
  })

  it('puts paragraphs on their own lines without leading or trailing breaks', () => {
    expect(convert('<p>one</p><p>two</p>').plainText).toBe('one\ntwo')
    expect(convert('intro<p>para</p>after').plainText).toBe('intro\npara\nafter')
    expect(convert('<p>only</p>').plainText).toBe('only')
  })

  it('keeps the style of a line break inside a styled tag', () => {
    expect(convert('<b>a<br>b</b>').runs).toEqual([{ text: 'a\nb', style: { bold: true } }])
  })

  it('flags line breaks that were already in the cell text', () => {
    expect(convert('line1\nline2').hasLineBreak).toBe(true)
  })
})

describe('htmlToRuns: entities', () => {
  it('decodes named and numeric entities', () => {
    expect(convert('Tom &amp; Jerry &lt;3 &copy; &#169; &#xA9; &euro;5').plainText).toBe('Tom & Jerry <3 © © © €5')
  })

  it('does not treat an encoded tag as a tag', () => {
    expect(convert('&lt;b&gt;not bold&lt;/b&gt;').runs).toEqual([{ text: '<b>not bold</b>', style: {} }])
  })

  it('leaves unknown or invalid entities alone', () => {
    expect(convert('&madeup; &#0; & alone').plainText).toBe('&madeup; &#0; & alone')
  })

  it('turns &nbsp; into a non-breaking space', () => {
    expect(convert('a&nbsp;b').plainText).toBe('a b')
  })
})

describe('htmlToRuns: tags with no rule', () => {
  it('strips them by default, keeping the text and the outer style', () => {
    const r = convert('<b>a <mark>b</mark></b> <span style="color:red">c</span>')
    expect(r.runs).toEqual([
      { text: 'a b', style: { bold: true } },
      { text: ' c', style: {} }
    ])
    expect(r.unknownTags).toEqual(['mark', 'span'])
  })

  it('keeps them as visible text when asked', () => {
    const r = convert('a <mark>b</mark> c', { unknownTagAction: 'keep' })
    expect(r.plainText).toBe('a <mark>b</mark> c')
    expect(r.unknownTags).toEqual(['mark'])
  })

  it('reports an unknown tag only once', () => {
    expect(convert('<x>1</x><x>2</x>').unknownTags).toEqual(['x'])
  })

  it('does not report built-in tags (br, p) as unknown', () => {
    expect(convert('<p>a<br>b</p>').unknownTags).toEqual([])
  })

  it('stops reporting a tag once it has a rule', () => {
    const rules = { ...DEFAULT_RULES, mark: { bold: true } }
    const r = convert('<mark>x</mark>', { rules })
    expect(r.unknownTags).toEqual([])
    expect(r.runs).toEqual([{ text: 'x', style: { bold: true } }])
  })
})
