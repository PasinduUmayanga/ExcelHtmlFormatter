/** Raw HTML shown in the detail panel: the start of very long cells only (the full text is in the CSV report). */
export const MAX_SHOWN_HTML = 5000
export function clip(text: string): string {
  if (text.length <= MAX_SHOWN_HTML) return text
  return `${text.slice(0, MAX_SHOWN_HTML)}… (${(text.length - MAX_SHOWN_HTML).toLocaleString('en-US')} more characters)`
}
