import { describe, expect, it } from 'vitest'
import { searchItems, type SearchItem } from '../src/features/search/search'

const items: SearchItem[] = [
  { id: 'p1', group: 'Pages', label: 'Templates', keywords: 'saved setup' },
  { id: 'p2', group: 'Pages', label: 'Recent Files' },
  { id: 'a1', group: 'Actions', label: 'Format HTML tags (Excel)', keywords: '.xlsx' },
  { id: 'r1', group: 'Recent files', label: 'report.xlsx', hint: 'C:/Users/me/Reports' },
  { id: 'h1', group: 'Help', label: 'User guide › Templates', keywords: 'save a setup you use often' },
  { id: 't1', group: 'Templates', label: 'Weekly report' }
]
const ids = (query: string, perGroup?: number, limit?: number) =>
  searchItems(items, query, perGroup, limit).map((i) => i.id)

describe('header search', () => {
  it('finds nothing for an empty query', () => {
    expect(ids('')).toEqual([])
    expect(ids('   ')).toEqual([])
  })

  it('needs every word, in the label, hint or keywords, ignoring case', () => {
    expect(ids('REPORT')).toEqual(['t1', 'r1'])
    expect(ids('reports xlsx')).toEqual(['r1'])
    expect(ids('saved setup')).toEqual(['p1'])
    expect(ids('nothing here')).toEqual([])
  })

  it('groups results in a fixed order, best label match first', () => {
    expect(ids('templ')).toEqual(['p1', 'h1'])
    expect(ids('e')).toEqual(['p2', 'p1', 'a1', 't1', 'r1', 'h1'])
  })

  it('limits each group and the whole list', () => {
    expect(ids('e', 1)).toEqual(['p2', 'a1', 't1', 'r1', 'h1'])
    expect(ids('e', 4, 3)).toEqual(['p2', 'p1', 'a1'])
  })
})
