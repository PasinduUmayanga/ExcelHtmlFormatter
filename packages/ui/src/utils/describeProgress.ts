import type { JobProgress as Progress } from '@hf/core'

/** Plain-language description of where a long task is. */
export function describeProgress(p: Progress, items = 'items'): string {
  const of = (unit: string) =>
    p.done !== undefined && p.total
      ? ` ${Math.min(p.done, p.total).toLocaleString()} of ${p.total.toLocaleString()} ${unit}`
      : ''
  switch (p.stage) {
    case 'reading':
      return 'Reading the file…'
    case 'scanning':
      return `Looking for HTML tags:${of(p.unit ?? 'sections')}${p.detail ? ` (${p.detail})` : ''}`
    case 'converting':
      return `Formatting ${items}:${of(p.unit ?? 'items')}${p.detail ? ` (${p.detail})` : ''}`
    case 'checking':
      return `Checking that no text is lost:${of(p.unit ?? 'items')}${p.detail ? ` (${p.detail})` : ''}`
    case 'saving':
      return 'Saving the new file…'
    case 'verifying':
      return `Checking the saved file:${of(p.unit ?? 'items')}${p.detail ? ` (${p.detail})` : ''}`
  }
}
