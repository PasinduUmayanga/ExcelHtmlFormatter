// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { crumbsFor } from '../src/design/organisms/AppHeader'
import { Breadcrumbs } from '../src/design/molecules'

describe('crumbsFor (header breadcrumbs)', () => {
  it('names each workflow screen after Workspace › format › action', () => {
    expect(crumbsFor('/open', 'Excel', null)).toEqual([
      { label: 'Workspace', to: '/open' },
      { label: 'Excel' },
      { label: 'Format HTML tags' },
      { label: 'Upload' }
    ])
    expect(crumbsFor('/preview/Team', 'Excel', '/preview/Team').map((c) => c.label)).toEqual([
      'Workspace',
      'Excel',
      'Format HTML tags',
      'Preview & export'
    ])
    expect(crumbsFor('/check/Team', 'Excel', null).at(-1)!.label).toBe('Content check')
  })

  it('names the global pages, and shows nothing extra on Home', () => {
    expect(crumbsFor('/', 'Excel', null)).toEqual([])
    expect(crumbsFor('/settings', 'Excel', null)).toEqual([{ label: 'Formatting Profiles' }])
    expect(crumbsFor('/help', 'Excel', null)).toEqual([{ label: 'Help & Support' }])
    expect(crumbsFor('/help/faq', 'Excel', null)[0]).toEqual({ label: 'Help & Support', to: '/help' })
  })
})

describe('Breadcrumbs', () => {
  it('links the earlier crumbs and marks the last one as the current page', async () => {
    const root = createRootRoute({
      component: () => <Breadcrumbs items={[{ label: 'Workspace', to: '/open' }, { label: 'Upload' }]} />
    })
    const router = createRouter({ routeTree: root, history: createMemoryHistory({ initialEntries: ['/'] }) })
    await router.load()
    const html = renderToStaticMarkup(<RouterProvider router={router} />)
    expect(html).toContain('<nav class="crumbs" aria-label="Breadcrumb">')
    expect(html).toContain('aria-label="Home page"')
    expect(html).toContain('<a href="#/open">Workspace</a>')
    expect(html).toContain('<span aria-current="page">Upload</span>')
  })
})
