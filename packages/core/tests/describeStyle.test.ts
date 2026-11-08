import { describe, expect, it } from 'vitest'
import { describeStyle, isConfigured } from '../src/describeStyle'
import { DEFAULT_RULES } from '../src/defaultRules'

describe('isConfigured', () => {
  it('knows rules and built-in tags', () => {
    expect(isConfigured('b', DEFAULT_RULES)).toBe(true)
    expect(isConfigured('br', DEFAULT_RULES)).toBe(true)
    expect(isConfigured('p', {})).toBe(true)
    expect(isConfigured('mark', DEFAULT_RULES)).toBe(false)
  })
})

describe('describeStyle', () => {
  it('lists every option in a fixed order', () => {
    const rules = { mark: { color: '#c00000', size: 14, font: 'Arial', strike: true, underline: true, italic: true, bold: true, vertAlign: 'superscript' as const } }
    expect(describeStyle('mark', rules)).toEqual({
      parts: ['Bold', 'Italic', 'Underline', 'Strikethrough', 'Superscript', '14 pt', 'Arial', '#C00000'],
      color: '#c00000'
    })
  })

  it('describes built-in tags', () => {
    expect(describeStyle('br', {})).toEqual({ parts: ['Line break'], builtin: 'Line break' })
  })

  it('returns null for a tag with no rule, and "No changes" for an empty rule', () => {
    expect(describeStyle('mark', DEFAULT_RULES)).toBeNull()
    expect(describeStyle('span', { span: {} })).toEqual({ parts: ['No changes'], color: undefined })
  })
})
