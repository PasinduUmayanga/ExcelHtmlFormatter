/** Why a link was not used as the cell's hyperlink. */
export type LinkProblem = 'unsafe' | 'invalid' | 'too-long'

export type LinkCheck = { ok: true; href: string } | { ok: false; problem: LinkProblem }

/** Longest link address Excel accepts. */
export const MAX_LINK_LENGTH = 2000

/**
 * Decides whether an `href` may become a clickable link in the output file.
 * Only absolute `http:`, `https:` (with a host) and `mailto:` addresses are allowed. `javascript:`,
 * `data:`, `file:`, `vbscript:` and other schemes are refused, as are relative or malformed addresses.
 * (The URL parser also removes tabs/newlines, so tricks like "java\nscript:" are caught.)
 */
export function checkLink(raw: string | undefined): LinkCheck {
  const value = (raw ?? '').trim()
  if (!value) return { ok: false, problem: 'invalid' }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return { ok: false, problem: 'invalid' }
  }
  const safe =
    url.protocol === 'mailto:' || ((url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== '')
  if (!safe) return { ok: false, problem: 'unsafe' }
  if (url.href.length > MAX_LINK_LENGTH) return { ok: false, problem: 'too-long' }
  return { ok: true, href: url.href }
}
