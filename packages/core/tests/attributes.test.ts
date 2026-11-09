import { describe, expect, it } from 'vitest'
import { parseAttributes } from '../src/attributes'
import { parseCssColor, parseCssFontFamily, parseCssFontSize, parseInlineStyle } from '../src/inlineStyle'
import { checkLink } from '../src/links'

describe('parseAttributes (F2-T1)', () => {
  it('reads double-quoted, single-quoted, unquoted and empty attributes', () => {
    expect({
      ...parseAttributes(`<a href="https://x.com/?a=1&amp;b=2" title='Hi there' target=_blank download>`)
    }).toEqual({
      href: 'https://x.com/?a=1&b=2',
      title: 'Hi there',
      target: '_blank',
      download: ''
    })
  })

  it('lower-cases names, keeps the first duplicate, and handles self-closing tags', () => {
    expect({ ...parseAttributes('<IMG SRC="a.png" src="b.png" ALT="Logo"/>') }).toEqual({ src: 'a.png', alt: 'Logo' })
  })

  it('handles ">" inside quoted values and tags without attributes', () => {
    expect({ ...parseAttributes('<span title="a > b">') }).toEqual({ title: 'a > b' })
    expect({ ...parseAttributes('<b>') }).toEqual({})
    expect({ ...parseAttributes('not a tag') }).toEqual({})
  })

  it('treats __proto__ as a plain attribute name', () => {
    const attrs = parseAttributes('<span __proto__="x" constructor="y">')
    expect(attrs.__proto__).toBe('x')
    expect(Object.getPrototypeOf(attrs)).toBeNull()
  })
})

describe('parseInlineStyle (F2-T1)', () => {
  it('reads the supported properties', () => {
    expect(
      parseInlineStyle(
        'color: #c00; font-weight: bold; font-style: italic; text-decoration: underline line-through; font-size: 16px; font-family: "Georgia", serif; vertical-align: super'
      )
    ).toEqual({
      color: '#CC0000',
      bold: true,
      italic: true,
      underline: true,
      strike: true,
      size: 12,
      font: 'Georgia',
      vertAlign: 'superscript'
    })
  })

  it('can switch formatting off', () => {
    expect(parseInlineStyle('font-weight: normal; font-style: normal; text-decoration: none')).toEqual({
      bold: false,
      italic: false,
      underline: false,
      strike: false
    })
    expect(parseInlineStyle('font-weight: 400')).toEqual({ bold: false })
    expect(parseInlineStyle('font-weight: 700')).toEqual({ bold: true })
  })

  it('reads background colours as highlight (white is not a highlight)', () => {
    expect(parseInlineStyle('background-color: yellow')).toEqual({ highlight: true })
    expect(parseInlineStyle('background: #fff')).toEqual({ highlight: false })
    expect(parseInlineStyle('background: transparent')).toEqual({})
  })

  it('ignores unknown properties, invalid values, !important and broken CSS', () => {
    expect(parseInlineStyle('display:none; color: notacolor; font-size: huge; margin: 4px')).toEqual({})
    expect(parseInlineStyle('color: red !important')).toEqual({ color: '#FF0000' })
    expect(parseInlineStyle(';;color;:;')).toEqual({})
    expect(parseInlineStyle('')).toEqual({})
    expect(parseInlineStyle('vertical-align: sub')).toEqual({ vertAlign: 'subscript' })
    expect(parseInlineStyle('vertical-align: baseline')).toEqual({})
  })

  it('parses colours, sizes and fonts', () => {
    expect(parseCssColor('rgb(255, 0, 0)')).toBe('#FF0000')
    expect(parseCssColor('rgba(0,0,255,0)')).toBeUndefined()
    expect(parseCssColor('Navy')).toBe('#000080')
    expect([
      parseCssFontSize('12pt'),
      parseCssFontSize('2em'),
      parseCssFontSize('150%'),
      parseCssFontSize('0px')
    ]).toEqual([12, 22, 16.5, undefined])
    expect([
      parseCssFontFamily('monospace'),
      parseCssFontFamily('sans-serif'),
      parseCssFontFamily("'Segoe UI', Arial")
    ]).toEqual(['Consolas', undefined, 'Segoe UI'])
  })
})

describe('checkLink (F2-T1)', () => {
  it('allows http, https and mailto', () => {
    expect(checkLink('https://example.com/a?b=1')).toEqual({ ok: true, href: 'https://example.com/a?b=1' })
    expect(checkLink('  http://example.com  ')).toEqual({ ok: true, href: 'http://example.com/' })
    expect(checkLink('mailto:someone@example.com')).toEqual({ ok: true, href: 'mailto:someone@example.com' })
  })

  it('refuses unsafe schemes, including disguised ones', () => {
    for (const href of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'java\nscript:alert(1)',
      ' javascript:alert(1)',
      'data:text/html,<b>x</b>',
      'file:///C:/Windows/system32/calc.exe',
      'vbscript:msgbox',
      'ftp://example.com'
    ]) {
      expect(checkLink(href), href).toEqual({ ok: false, problem: 'unsafe' })
    }
  })

  it('refuses relative, empty and malformed addresses, and very long ones', () => {
    for (const href of ['/page', 'page.html', '#top', '', undefined, 'http://']) {
      expect(checkLink(href).ok, String(href)).toBe(false)
    }
    expect(checkLink('https://example.com/' + 'a'.repeat(2100))).toEqual({ ok: false, problem: 'too-long' })
  })
})
