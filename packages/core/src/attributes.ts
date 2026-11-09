import { decodeEntities } from './tokenize'

// name, then optionally = "double" | 'single' | unquoted
const ATTRIBUTE_RE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g

/**
 * Reads the attributes of a tag's raw text, e.g. `<a href="x" title='y'>` → { href: 'x', title: 'y' }.
 * Names are lower-cased; values have entities decoded; the first occurrence of a name wins.
 * Returns a null-prototype object, so attribute names like `__proto__` are plain keys.
 */
export function parseAttributes(rawTag: string): Record<string, string> {
  const attrs: Record<string, string> = Object.create(null)
  const name = /^<\/?\s*[a-zA-Z][a-zA-Z0-9-]*/.exec(rawTag)
  if (!name) return attrs
  const body = rawTag.slice(name[0].length).replace(/\/?>$/, '')
  for (const m of body.matchAll(ATTRIBUTE_RE)) {
    const key = m[1].toLowerCase()
    if (key in attrs) continue
    attrs[key] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '')
  }
  return attrs
}
