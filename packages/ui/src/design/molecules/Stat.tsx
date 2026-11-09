/** A number with a label, used in the totals row of the analysis and preview screens. */
export function Stat({ value, label, tone }: { value: number; label: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="stat">
      <div className={`v ${tone ?? ''}`}>{value.toLocaleString()}</div>
      <div className="l">{label}</div>
    </div>
  )
}
