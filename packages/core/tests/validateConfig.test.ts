import { describe, expect, it } from 'vitest'
import { normalizeColor, normalizeTagName, sanitizeStyle, validateConfig } from '../src/validateConfig'
import { defaultConfig } from '../src/defaultRules'

describe('normalizeTagName', () => {
  it('accepts tag names typed in different ways', () => {
    expect(normalizeTagName('mark')).toBe('mark')
    expect(normalizeTagName(' <Mark> ')).toBe('mark')
    expect(normalizeTagName('</h1>')).toBe('h1')
    expect(normalizeTagName('my-tag')).toBe('my-tag')
  })
  it('rejects anything that is not a tag name', () => {
    for (const bad of ['', '1b', 'a b', '<>', 'b>c', 'été']) expect(normalizeTagName(bad)).toBeNull()
  })
})

describe('normalizeColor', () => {
  it('normalises hex colors', () => {
    expect(normalizeColor('#c00')).toBe('#CC0000')
    expect(normalizeColor('1f6feb')).toBe('#1F6FEB')
  })
  it('rejects other values', () => {
    expect(normalizeColor('red')).toBeUndefined()
    expect(normalizeColor(123)).toBeUndefined()
  })
})

describe('sanitizeStyle', () => {
  it('keeps valid options', () => {
    expect(
      sanitizeStyle({
        bold: true,
        italic: true,
        underline: true,
        strike: true,
        color: '#c00',
        size: 14,
        font: ' Arial ',
        vertAlign: 'subscript'
      })
    ).toEqual({
      bold: true,
      italic: true,
      underline: true,
      strike: true,
      color: '#CC0000',
      size: 14,
      font: 'Arial',
      vertAlign: 'subscript'
    })
  })
  it('drops invalid or unknown options', () => {
    expect(
      sanitizeStyle({ bold: 'yes', size: 0, font: '', vertAlign: 'middle', color: 'blue', evil: '<script>' })
    ).toEqual({})
    expect(sanitizeStyle({ size: 1000 })).toEqual({})
    expect(sanitizeStyle({ font: 'x'.repeat(32) })).toEqual({})
    expect(sanitizeStyle(null)).toEqual({})
  })
  it('rounds sizes to half points', () => {
    expect(sanitizeStyle({ size: 10.3 })).toEqual({ size: 10.5 })
  })
})

describe('validateConfig', () => {
  it('accepts a saved config unchanged', () => {
    const config = defaultConfig()
    expect(validateConfig(JSON.parse(JSON.stringify(config)))).toEqual(config)
  })

  it('keeps empty rules (a tag set to "keep text plain")', () => {
    expect(validateConfig({ rules: { span: {} } }).rules).toEqual({ span: {} })
  })

  it('fills in missing fields and fixes bad ones', () => {
    expect(
      validateConfig({
        rules: { B: { bold: true }, '1x': {}, br: { bold: true } },
        unknownTagAction: 'explode',
        profileName: 5
      })
    ).toEqual({ profileName: 'Default', unknownTagAction: 'strip', rules: { b: { bold: true } } })
  })

  it('reads the export format from the demo', () => {
    const exported = {
      profileName: 'Office',
      unknownTagAction: 'keep',
      rules: { mark: { bold: true, color: '#C00000' } }
    }
    expect(validateConfig(exported)).toEqual(exported)
  })

  it('rejects files that are not tag styles', () => {
    for (const bad of [null, 'text', [], {}, { rules: [] }, { rules: 'b' }]) {
      expect(() => validateConfig(bad)).toThrow('This file does not contain tag styles.')
    }
  })
})
