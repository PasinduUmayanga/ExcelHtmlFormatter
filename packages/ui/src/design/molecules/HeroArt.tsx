import { FileGlyph, type GlyphKind } from '../atoms'

const KINDS: readonly GlyphKind[] = ['excel', 'word', 'pdf', 'text']

/**
 * Home's picture (prototype): the four kinds of file on tilted glass cards. Decorative, hidden from screen readers
 * and from narrow windows (see .hero-art).
 */
export function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      {KINDS.map((kind) => (
        <span key={kind} className={`hero-doc ${kind}`}>
          <FileGlyph kind={kind} size={52} />
        </span>
      ))}
    </div>
  )
}
