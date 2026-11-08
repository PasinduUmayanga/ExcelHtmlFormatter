/**
 * A small, forgiving HTML tokenizer for the text inside Excel cells.
 *
 * It does not need a browser DOM, so the same code runs in the UI, in the
 * Electron main process, in a background worker, and in unit tests.
 */

export type Token =
  | { type: 'text'; text: string }
  | { type: 'open'; tag: string; raw: string; selfClosing: boolean }
  | { type: 'close'; tag: string; raw: string }
  | { type: 'comment'; raw: string }

// Matches a comment, or an opening/closing tag. Attribute values may be quoted
// and contain ">" (e.g. title="a > b"). A "<" not followed by a letter or "/"
// (e.g. "x < 5") is left as normal text.
const TAG_RE = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g

export function tokenize(html: string): Token[] {
  const tokens: Token[] = []
  let last = 0
  for (const m of html.matchAll(TAG_RE)) {
    const start = m.index ?? 0
    if (start > last) tokens.push({ type: 'text', text: decodeEntities(html.slice(last, start)) })
    const raw = m[0]
    if (raw.startsWith('<!--')) tokens.push({ type: 'comment', raw })
    else if (m[1] === '/') tokens.push({ type: 'close', tag: m[2].toLowerCase(), raw })
    else tokens.push({ type: 'open', tag: m[2].toLowerCase(), raw, selfClosing: m[4] === '/' })
    last = start + raw.length
  }
  if (last < html.length) tokens.push({ type: 'text', text: decodeEntities(html.slice(last)) })
  return tokens
}

/** True if the text contains at least one HTML tag. */
export function hasHtml(text: string): boolean {
  for (const m of text.matchAll(TAG_RE)) if (!m[0].startsWith('<!--')) return true
  return false
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  copy: '©', reg: '®', trade: '™', hellip: '…', mdash: '—', ndash: '–',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»',
  bull: '•', middot: '·', deg: '°', times: '×', divide: '÷', plusmn: '±',
  euro: '€', pound: '£', yen: '¥', cent: '¢', sect: '§', para: '¶',
  frac12: '½', frac14: '¼', frac34: '¾', sup2: '²', sup3: '³', micro: 'µ'
}

/** Turns &amp; &lt; &#169; &#xA9; … back into characters. Unknown entities are left as they are. */
export function decodeEntities(text: string): string {
  if (!text.includes('&')) return text
  return text.replace(/&(#[xX][0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body: string) => {
    if (body[0] === '#') {
      const hex = body[1] === 'x' || body[1] === 'X'
      const code = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10)
      const valid = code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
      return valid ? String.fromCodePoint(code) : match
    }
    return NAMED_ENTITIES[body] ?? match
  })
}
