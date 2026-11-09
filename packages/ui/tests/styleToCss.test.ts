import { describe, expect, it } from 'vitest'
import { styleToCss } from '../src/utils/styleToCss'

describe('styleToCss', () => {
  it('maps styles to CSS for previews', () => {
    expect(
      styleToCss({ bold: true, italic: true, underline: true, strike: true, color: '#FF0000', size: 14, font: 'Arial' })
    ).toEqual({
      fontWeight: 700,
      fontStyle: 'italic',
      textDecoration: 'underline line-through',
      color: '#FF0000',
      fontSize: '14pt',
      fontFamily: '"Arial"'
    })
  })

  it('makes superscript and subscript smaller', () => {
    expect(styleToCss({ vertAlign: 'superscript' })).toEqual({ verticalAlign: 'super', fontSize: '75%' })
    expect(styleToCss({ vertAlign: 'subscript', size: 12 })).toEqual({ verticalAlign: 'sub', fontSize: '9pt' })
  })

  it('returns nothing for an empty style', () => {
    expect(styleToCss({})).toEqual({})
  })
})
