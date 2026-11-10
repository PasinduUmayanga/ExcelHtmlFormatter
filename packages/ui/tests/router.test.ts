// @vitest-environment happy-dom
// The router needs a browser-like window (no DOM = server-rendering mode); happy-dom provides one.
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryHistory } from '@tanstack/react-router'
import type { DocumentSummary } from '@hf/core'
import { createFormatterRouter } from '../src/router'
import { canVisit, useApp } from '../src/state/store'

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

afterEach(() => useApp.setState({ doc: null, selected: [], loading: false, exportResult: null, workflowActive: false }))

describe('routes and guards (TanStack Router)', () => {
  it('starts on Home (/), which needs no open file', async () => {
    expect((await visit('/')).path).toBe('/')
  })

  it('keeps the workflow locked (back to Home) until it is started from Home', async () => {
    for (const path of ['/upload', '/configure', '/configure?tab=tags', '/preview/Products', '/check/Team']) {
      expect((await visit(path)).path).toBe('/')
    }
  })

  it('sends document screens to Upload once the workflow is started but no file is open yet', async () => {
    useApp.getState().startWorkflow()
    expect((await visit('/upload')).path).toBe('/upload')
    for (const path of ['/configure', '/preview/Products']) {
      expect((await visit(path)).path).toBe('/upload')
    }
  })

  it('always allows Tag styles', async () => {
    expect((await visit('/settings')).path).toBe('/settings')
  })

  it('needs at least one selected section for the preview', async () => {
    useApp.setState({ workflowActive: true, doc, selected: [] })
    expect((await visit('/configure')).path).toBe('/configure')
    expect((await visit('/preview/Products')).path).toBe('/configure')
  })

  it('keeps only a valid Configure tab and section', async () => {
    useApp.setState({ workflowActive: true, doc, selected: ['Team'] })
    expect(await visit('/configure?tab=tags&section=Team')).toEqual({
      path: '/configure',
      search: { tab: 'tags', section: 'Team' }
    })
    expect((await visit('/configure?tab=weird')).search).toEqual({})
    expect((await visit(`/configure?section=${'x'.repeat(201)}`)).search).toEqual({})
  })

  it('switches to the first selected section when the address names another one', async () => {
    useApp.setState({ workflowActive: true, doc, selected: ['Team', 'Summary'] })
    expect((await visit('/preview/Team')).path).toBe('/preview/Team')
    expect((await visit('/preview/Nope')).path).toBe('/preview/Team')
  })

  it('keeps section names with spaces and symbols intact', async () => {
    const odd = { ...doc, sections: [{ ...doc.sections[0], name: 'Q1 & Q2 (draft)' }] }
    useApp.setState({ workflowActive: true, doc: odd, selected: ['Q1 & Q2 (draft)'] })
    const router = createFormatterRouter({ history: createMemoryHistory({ initialEntries: ['/configure'] }) })
    await router.load()
    await router.navigate({ to: '/preview/$section', params: { section: 'Q1 & Q2 (draft)' }, search: {} })
    expect(router.state.matches.at(-1)?.params).toEqual({ section: 'Q1 & Q2 (draft)' })
  })

  it('opens Help without a file, keeping only a sensible search and section', async () => {
    expect(await visit('/help?q=wrap')).toEqual({ path: '/help', search: { q: 'wrap' } })
    expect((await visit(`/help?q=${'x'.repeat(201)}`)).search).toEqual({})
    expect(await visit('/help/faq?section=links')).toEqual({ path: '/help/faq', search: { section: 'links' } })
    for (const bad of ['%3Cscript%3E', 'A%20B', 'x'.repeat(81)]) {
      expect((await visit(`/help/faq?section=${bad}`)).search).toEqual({})
    }
  })

  it('validates search settings', async () => {
    useApp.setState({ workflowActive: true, doc, selected: ['Team'] })
    expect((await visit('/preview/Team?view=original')).search).toEqual({ view: 'original' })
    expect((await visit('/preview/Team?view=weird')).search).toEqual({})
    expect((await visit('/settings?tag=mark&back=%2Fconfigure%3Ftab%3Dtags')).search).toEqual({
      tag: 'mark',
      back: '/configure?tab=tags'
    })
    // "back" must stay inside the app
    expect((await visit('/settings?back=https%3A%2F%2Fexample.com')).search).toEqual({})
    expect((await visit('/settings?back=%2F%2Fexample.com')).search).toEqual({})
    expect((await visit('/settings?tag=')).search).toEqual({})
  })
})

describe('canVisit', () => {
  it('follows the open file and the selection', () => {
    expect(canVisit({ workflowActive: true, doc: null, loading: false, selected: [] }, 'sections')).toBe(false)
    // A file still open after the workflow ended (it never is, but the rule doesn't depend on that)
    expect(canVisit({ workflowActive: false, doc, loading: false, selected: ['Team'] }, 'preview')).toBe(false)
    expect(canVisit({ workflowActive: true, doc, loading: true, selected: ['Team'] }, 'preview')).toBe(false)
    expect(canVisit({ workflowActive: true, doc, loading: false, selected: [] }, 'sections')).toBe(true)
    expect(canVisit({ workflowActive: true, doc, loading: false, selected: [] }, 'preview')).toBe(false)
    expect(canVisit({ workflowActive: true, doc, loading: false, selected: ['Team'] }, 'preview')).toBe(true)
  })

  it('opens the content check for a selected section, with a validated cell', async () => {
    expect((await visit('/check/Team')).path).toBe('/')
    useApp.setState({ workflowActive: true, doc, selected: ['Team'] })
    expect(await visit('/check/Team?cell=C7')).toEqual({ path: '/check/Team', search: { cell: 'C7' } })
    expect((await visit('/check/Products')).path).toBe('/preview/Team')
    // Anything that is not a short cell locator is dropped
    expect((await visit('/check/Team?cell=%3Cscript%3E')).search).toEqual({})
    expect((await visit(`/check/Team?cell=${'A'.repeat(41)}`)).search).toEqual({})
  })

  it('shows the saved-file check only after a save that was verified', async () => {
    useApp.setState({ workflowActive: true, doc, selected: ['Team'] })
    expect((await visit('/check/Summary?saved=true')).path).toBe('/preview/Team')
    const verification = { compared: 3, differences: 1, items: [], truncated: false }
    const stats = {
      sections: [],
      converted: 0,
      withLineBreaks: 0,
      unknownTags: [],
      linksAdded: 0,
      linksSkipped: 0,
      highlighted: 0,
      check: { checked: 0, complete: 0, issues: 0, notes: 0, items: [], truncated: false }
    }
    useApp.setState({ exportResult: { path: 'C:/y.xlsx', fileName: 'y.xlsx', stats, verification } })
    // Unselected sections can have differences too (they must stay unchanged)
    expect(await visit('/check/Summary?saved=true')).toEqual({ path: '/check/Summary', search: { saved: true } })
    expect((await visit('/check/Nope?saved=true')).path).toBe('/preview/Team')
    expect((await visit('/check/Team?saved=yes')).search).toEqual({})
  })
})
