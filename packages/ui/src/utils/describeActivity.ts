import { count, type ActivityEntry } from '@hf/core'

type Words = { singular: string; plural: string }

/** One line about what happened, e.g. "Saved from report.xlsx · 41 cells formatted · verified". */
export function describeActivity(entry: ActivityEntry, unit: Words): string {
  if (entry.kind === 'opened') return 'Opened'
  const parts = [entry.sourceName ? `Saved from ${entry.sourceName}` : 'Saved']
  if (entry.converted !== undefined) parts.push(`${count(entry.converted, unit)} formatted`)
  if (entry.check === 'verified') parts.push('saved file verified')
  if (entry.check === 'differences') {
    parts.push(`${count(entry.differences ?? 0, { singular: 'difference', plural: 'differences' })} in the saved file`)
  }
  if (entry.check === 'not-checked') parts.push('saved file not checked')
  return parts.join(' · ')
}

/** When it happened: "Today, 14:05", "Yesterday, 09:30" or "7 Nov 2026, 16:45" (local time). */
export function formatWhen(iso: string, now = new Date()): string {
  const at = new Date(iso)
  const time = at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((day(now) - day(at)) / 86_400_000)
  if (days === 0) return `Today, ${time}`
  if (days === 1) return `Yesterday, ${time}`
  return `${at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${time}`
}
