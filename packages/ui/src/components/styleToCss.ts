import type { CSSProperties } from 'react'
import type { TagStyle } from '@hf/core'

/** How a run will look in Excel, approximated in CSS for on-screen previews. */
export function styleToCss(style: TagStyle): CSSProperties {
  const css: CSSProperties = {}
  if (style.bold) css.fontWeight = 700
  if (style.italic) css.fontStyle = 'italic'
  const lines = [style.underline && 'underline', style.strike && 'line-through'].filter(Boolean)
  if (lines.length) css.textDecoration = lines.join(' ')
  if (style.color) css.color = style.color
  if (style.size) css.fontSize = `${style.size}pt`
  if (style.font) css.fontFamily = `"${style.font}"`
  if (style.vertAlign) {
    css.verticalAlign = style.vertAlign === 'superscript' ? 'super' : 'sub'
    css.fontSize = style.size ? `${style.size * 0.75}pt` : '75%'
  }
  return css
}
