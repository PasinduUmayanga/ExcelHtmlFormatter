import { describe, expect, it } from 'vitest'
import { describeStyle, isConfigured } from '../src/describeStyle'
import { DEFAULT_RULES } from '../src/defaultRules'

describe('isConfigured', () => {
  it('knows rules and built-in tags', () => {
    expect(isConfigured('b', DEFAULT_RULES)).toBe(true)
    expect(isConfigured('br', DEFAULT_RULES)).toBe(true)
    expect(isConfigured('p', {})).toBe(true)
    expect(isConfigured('mark', DEFAULT_RULES)).toBe(true)
    expect(isConfigured('h1', {})).toBe(true)
    expect(isConfigured('custom', DEFAULT_RULES)).toBe(false)
    expect(isConfigured('toString', {})).toBe(false)
  })
})

describe('describeStyle', () => {
  it('lists every option in a fixed order', () => {
    const rules = {
      mark: {
        color: '#c00000',
        size: 14,
        font: 'Arial',
        strike: true,
        underline: true,
        italic: true,
        bold: true,
        vertAlign: 'superscript' as const
      }
    }
    expect(describeStyle('mark', rules)).toEqual({
      parts: ['Bold', 'Italic', 'Underline', 'Strikethrough', 'Superscript', '14 pt', 'Arial', '#C00000'],
      color: '#c00000'
    })
  })

  it('describes built-in tags', () => {
    expect(describeStyle('br', {})).toEqual({ parts: ['Line break'], builtin: 'Line break' })
  })

  it('returns null for a tag with no rule, and "No changes" for an empty rule', () => {
    expect(describeStyle('custom', DEFAULT_RULES)).toBeNull()
    expect(describeStyle('toString', {})).toBeNull()
    expect(describeStyle('custom', { custom: {} })).toEqual({ parts: ['No changes'], color: undefined })
  })

  it('falls back to the built-in look when a styled tag has no rule', () => {
    expect(describeStyle('h1', {})).toEqual({ parts: ['Bold', '18 pt'], color: undefined, fallback: true })
    expect(describeStyle('span', {})).toEqual({ parts: ['No changes'], color: undefined, fallback: true })
    expect(describeStyle('h1', { h1: { italic: true } })).toEqual({ parts: ['Italic'], color: undefined })
  })

  it('marks structural tags as built in', () => {
    expect(describeStyle('li', {})?.builtin).toBeTruthy()
    expect(describeStyle('hr', {})?.builtin).toBeTruthy()
  })
})
