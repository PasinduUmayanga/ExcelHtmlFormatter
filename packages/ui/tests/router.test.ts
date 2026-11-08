// @vitest-environment happy-dom
// The router needs a browser-like window (no DOM = server-rendering mode); happy-dom provides one.
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryHistory } from '@tanstack/react-router'
import type { DocumentSummary } from '@hf/core'
import { createFormatterRouter } from '../src/router'
import { canVisit, useApp } from '../src/store'

const doc: DocumentSummary = {
  file: { path: 'C:/x.xlsx', name: 'x.xlsx', sizeBytes: 1 },
  sections: ['Products', 'Team', 'Summary'].map((name) => ({
    name,
    state: 'visible',
    sizeLabel: '1 × 1',
    scan: { htmlCells: 0, tags: {} }
  }))
}

/** Loads `path` in a router with in-memory history and returns where the guards ended up. */
async function visit(path: string) {
  const router = createFormatterRouter({ history: createMemoryHistory({ initialEntries: [path] }) })
  await router.load()
  // `search` = what screens read with useSearch(): the values after validateSearch, not the raw address.
  return {
    path: router.state.location.pathname,
    search: router.state.matches.at(-1)?.search as Record<string, unknown>
  }
}

afterEach(() => useApp.setState({ doc: null, selected: [], loading: false }))

describe('routes and guards (TanStack Router)', () => {
  it('starts on /open', async () => {
    expect((await visit('/')).path).toBe('/open')
  })

  it('sends every document screen back to /open when no file is open', async () => {
    for (const path of ['/sections', '/analysis/Products', '/preview/Products']) {
      expect((await visit(path)).path).toBe('/open')
    }
  })

  it('always allows Tag styles', async () => {
    expect((await visit('/settings')).path).toBe('/settings')
  })

  it('needs at least one selected section for analysis and preview', async () => {
    useApp.setState({ doc, selected: [] })
    expect((await visit('/sections')).path).toBe('/sections')
    expect((await visit('/analysis/Products')).path).toBe('/sections')
  })

  it('switches to the first selected section when the address names another one', async () => {
    useApp.setState({ doc, selected: ['Team', 'Summary'] })
    expect((await visit('/analysis/Team')).path).toBe('/analysis/Team')
    expect((await visit('/analysis/Products')).path).toBe('/analysis/Team')
    expect((await visit('/preview/Nope')).path).toBe('/preview/Team')
  })

  it('keeps section names with spaces and symbols intact', async () => {
    const odd = { ...doc, sections: [{ ...doc.sections[0], name: 'Q1 & Q2 (draft)' }] }
    useApp.setState({ doc: odd, selected: ['Q1 & Q2 (draft)'] })
    const router = createFormatterRouter({ history: createMemoryHistory({ initialEntries: ['/sections'] }) })
    await router.load()
    await router.navigate({ to: '/analysis/$section', params: { section: 'Q1 & Q2 (draft)' } })
    expect(router.state.matches.at(-1)?.params).toEqual({ section: 'Q1 & Q2 (draft)' })
  })

  it('validates search settings', async () => {
    useApp.setState({ doc, selected: ['Team'] })
    expect((await visit('/preview/Team?view=original')).search).toEqual({ view: 'original' })
    expect((await visit('/preview/Team?view=weird')).search).toEqual({})
    expect((await visit('/settings?tag=mark&back=%2Fanalysis%2FTeam')).search).toEqual({
      tag: 'mark',
      back: '/analysis/Team'
    })
    // "back" must stay inside the app
    expect((await visit('/settings?back=https%3A%2F%2Fexample.com')).search).toEqual({})
    expect((await visit('/settings?back=%2F%2Fexample.com')).search).toEqual({})
    expect((await visit('/settings?tag=')).search).toEqual({})
  })
})

describe('canVisit', () => {
  it('follows the open file and the selection', () => {
    expect(canVisit({ doc: null, loading: false, selected: [] }, 'sections')).toBe(false)
    expect(canVisit({ doc, loading: true, selected: ['Team'] }, 'analysis')).toBe(false)
    expect(canVisit({ doc, loading: false, selected: [] }, 'sections')).toBe(true)
    expect(canVisit({ doc, loading: false, selected: [] }, 'preview')).toBe(false)
    expect(canVisit({ doc, loading: false, selected: ['Team'] }, 'preview')).toBe(true)
  })
})
