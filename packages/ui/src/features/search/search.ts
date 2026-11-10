/**
 * The header search (Ctrl+K, prototype top bar): one list of things you can go to — pages, file types, actions,
 * recent files, favourites, templates, profiles and help topics. Plain functions, so they are unit-tested; the
 * SearchBox organism builds the items from the app's data and runs the chosen one.
 */
export type SearchGroup =
  'Pages' | 'File types' | 'Actions' | 'Recent files' | 'Favorites' | 'Templates' | 'Profiles' | 'Help'

export interface SearchItem {
  /** Unique within the list */
  id: string
  group: SearchGroup
  label: string
  /** A second line: a folder, a description… */
  hint?: string
  /** Extra words it can be found by */
  keywords?: string
}

const GROUP_ORDER: readonly SearchGroup[] = [
  'Pages',
  'Actions',
  'File types',
  'Templates',
  'Favorites',
  'Recent files',
  'Profiles',
  'Help'
]

/** The words of a query, lower case. */
const words = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean)

/**
 * The items that contain every word of the query (in the label, hint or keywords), best first: a label that starts
 * with the query, then a label that contains it, then the rest; grouped in a fixed order. At most `perGroup` per
 * group and `limit` in all. An empty query finds nothing.
 */
export function searchItems(items: readonly SearchItem[], query: string, perGroup = 4, limit = 12): SearchItem[] {
  const wanted = words(query)
  if (wanted.length === 0) return []
  const phrase = wanted.join(' ')
  const scored = items
    .map((item) => {
      const label = item.label.toLowerCase()
      const all = `${label} ${item.hint ?? ''} ${item.keywords ?? ''}`.toLowerCase()
      if (!wanted.every((w) => all.includes(w))) return null
      const score = label.startsWith(phrase) ? 0 : label.includes(phrase) ? 1 : 2
      return { item, score }
    })
    .filter((x): x is { item: SearchItem; score: number } => x !== null)
  const out: SearchItem[] = []
  for (const group of GROUP_ORDER) {
    const inGroup = scored
      .filter((s) => s.item.group === group)
      .sort((a, b) => a.score - b.score || a.item.label.localeCompare(b.item.label))
      .slice(0, perGroup)
    out.push(...inGroup.map((s) => s.item))
  }
  return out.slice(0, limit)
}
