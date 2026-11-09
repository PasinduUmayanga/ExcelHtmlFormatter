import { describe, expect, it } from 'vitest'
import { cleanStyle, sameIgnoringSpace, sameStyle, tokenize, type TagStyle } from '../src'

describe('sameStyle', () => {
  it('treats empty and switched-off options as not set', () => {
    expect(sameStyle({ bold: true }, { bold: true, italic: false, color: undefined, font: '' })).toBe(true)
    expect(sameStyle({ bold: true }, { bold: true, size: 12 })).toBe(false)
    const s: TagStyle = { color: '#C00000' }
    expect(sameStyle(s, s)).toBe(true)
  })

  it('also compares options it does not know (from other settings versions)', () => {
    const a = { bold: true, shadow: 'x' } as TagStyle
    expect(sameStyle(a, { bold: true } as TagStyle)).toBe(false)
    expect(sameStyle({ bold: true } as TagStyle, a)).toBe(false)
    expect(sameStyle(a, { bold: true, shadow: 'x' } as TagStyle)).toBe(true)
    expect(sameStyle({ shadow: false } as TagStyle, {})).toBe(true)
    expect(cleanStyle(a)).toEqual({ bold: true, shadow: 'x' })
  })
})

describe('sameIgnoringSpace', () => {
  it('ignores every kind of whitespace (the same characters as the regular expression class for spaces)', () => {
    expect(sameIgnoringSpace('a b\tc\nd', 'abcd')).toBe(true)
    expect(sameIgnoringSpace('a b c　', ' a b c')).toBe(true)
    expect(sameIgnoringSpace('', '  \n ')).toBe(true)
  })

  it('notices any other difference, including length', () => {
    expect(sameIgnoringSpace('abc', 'abd')).toBe(false)
    expect(sameIgnoringSpace('abc', 'ab')).toBe(false)
    expect(sameIgnoringSpace('ab', 'a b c')).toBe(false)
    expect(sameIgnoringSpace('aé', 'a e')).toBe(false)
  })
})

describe('tokenize reuse', () => {
  it('returns the same tokens for the same text, and new ones for other text', () => {
    const first = tokenize('<b>x</b>')
    expect(tokenize('<b>x</b>')).toBe(first)
    const other = tokenize('<i>y</i>')
    expect(other).not.toBe(first)
    expect(tokenize('<b>x</b>')).toEqual(first)
  })
})
