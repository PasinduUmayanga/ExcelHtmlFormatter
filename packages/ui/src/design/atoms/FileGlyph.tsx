import { useId } from 'react'

/**
 * A kind of file: a coloured page with a label (X, W, PDF, TXT), drawn as in the "Blue Shiny Wave" prototype's
 * assets/icons/{excel,word,pdf,text}.svg. Inline rather than image files so no asset loading or CSP change is needed.
 * Decorative: the type is always named next to it.
 */
export const GLYPH_KINDS = {
  excel: { label: 'X', from: '#21a366', to: '#107c41', fontSize: 44 },
  word: { label: 'W', from: '#2b7cd3', to: '#185abd', fontSize: 44 },
  pdf: { label: 'PDF', from: '#ef6262', to: '#c62f2f', fontSize: 28 },
  text: { label: 'TXT', from: '#91a9cb', to: '#55708f', fontSize: 28 }
} as const

export type GlyphKind = keyof typeof GLYPH_KINDS

export function FileGlyph({ kind, size = 48 }: { kind: GlyphKind; size?: number }) {
  const { label, from, to, fontSize } = GLYPH_KINDS[kind]
  // Several glyphs share a page, so each needs its own gradient id.
  const gradient = `glyph-${useId().replace(/:/g, '')}`
  return (
    <svg className="file-glyph" viewBox="0 0 84 84" width={size} height={size} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <path d="M15 4h40l17 17v56a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z" fill={`url(#${gradient})`} />
      <path d="M55 4v17h17" fill="#ffffff" fillOpacity="0.33" />
      <rect x="3" y="31" width="53" height="39" rx="5" fill={to} stroke="#ffffff" strokeOpacity="0.27" />
      <text
        x="29"
        y="58"
        textAnchor="middle"
        fontFamily="'Segoe UI', Arial, sans-serif"
        fontSize={fontSize}
        fontWeight="700"
        fill="#ffffff"
      >
        {label}
      </text>
      <path d="M59 34h8M59 43h8M59 52h8" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="2" />
    </svg>
  )
}

/** The kind of file a name is, for the glyph next to it (recent activity). */
export function glyphKindOf(fileName: string): GlyphKind {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  if (ext === 'xlsx' || ext === 'xls') return 'excel'
  if (ext === 'docx' || ext === 'doc') return 'word'
  if (ext === 'pdf') return 'pdf'
  return 'text'
}
