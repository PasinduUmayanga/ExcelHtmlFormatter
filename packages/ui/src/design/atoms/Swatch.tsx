/**
 * A small square of colour, e.g. a tag's font colour. The colour is data (from the settings), which is why
 * it is the one style set on the element itself.
 */
export function Swatch({ color }: { color: string }) {
  return <span className="swatch" style={{ background: color }} />
}
