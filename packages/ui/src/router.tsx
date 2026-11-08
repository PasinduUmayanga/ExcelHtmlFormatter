import { createContext, useContext, type ComponentType } from 'react'
import {
  createHashHistory, createRootRoute, createRoute, createRouter, redirect, type RouterHistory
} from '@tanstack/react-router'
import type { ConvertOptions, FormatInfo } from '@hf/core'
import { canVisit, useApp } from './store'
import { AppLayout } from './AppLayout'
import { OpenFile } from './screens/OpenFile'
import { SelectSections } from './screens/SelectSections'
import { TagAnalysis } from './screens/TagAnalysis'
import { PreviewExport } from './screens/PreviewExport'
import { TagStyles } from './screens/TagStyles'

/* ---------- What each app plugs in ---------- */

export type PreviewView = 'formatted' | 'original'

/** Props of the app's preview component (e.g. the Excel grid). `preview` is the adapter's preview data. */
export interface PreviewProps {
  preview: unknown
  view: PreviewView
  options: ConvertOptions
}

export interface FormatterAppConfig {
  format: FormatInfo
  Preview: ComponentType<PreviewProps>
}

const AppConfigContext = createContext<FormatterAppConfig | null>(null)
export const FormatterAppProvider = AppConfigContext.Provider

/** The format details and preview component of the running app. */
export function useFormatterApp(): FormatterAppConfig {
  const value = useContext(AppConfigContext)
  if (!value) throw new Error('useFormatterApp() must be used inside <FormatterApp>')
  return value
}

/* ---------- Routes ---------- */

/**
 * The route tree shared by every formatter app:
 *
 *   /                      -> /open
 *   /open                  open a file
 *   /sections              choose sections (sheets, …)
 *   /analysis/$section     tags found in one section
 *   /preview/$section      result preview (?view=original shows the raw HTML)
 *   /settings              tag styles (?tag=b opens one tag, ?back=/analysis/X adds a "Done" button)
 *
 * Guards send the user back to /open or /sections when there is nothing to show.
 * Hash history is used because the packaged app is loaded from a file:// address.
 */
export function createFormatterRouter(options: { history?: RouterHistory } = {}) {
  const rootRoute = createRootRoute({ component: AppLayout })

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    beforeLoad: () => {
      throw redirect({ to: '/open' })
    }
  })

  const openRoute = createRoute({ getParentRoute: () => rootRoute, path: '/open', component: OpenFile })

  const sectionsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sections',
    beforeLoad: () => {
      if (!canVisit(useApp.getState(), 'sections')) throw redirect({ to: '/open' })
    },
    component: SelectSections
  })

  /** Shared guard for the two per-section screens. */
  function guardSection(section: string, screen: 'analysis' | 'preview') {
    const state = useApp.getState()
    if (!canVisit(state, 'sections')) throw redirect({ to: '/open' })
    if (!canVisit(state, screen)) throw redirect({ to: '/sections' })
    if (!state.selected.includes(section)) {
      const first = state.selected[0]
      throw screen === 'analysis'
        ? redirect({ to: '/analysis/$section', params: { section: first } })
        : redirect({ to: '/preview/$section', params: { section: first } })
    }
  }

  const analysisRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/analysis/$section',
    beforeLoad: ({ params }) => guardSection(params.section, 'analysis'),
    component: TagAnalysis
  })

  const previewRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/preview/$section',
    // Always return every key: TanStack keeps the raw value of any key left out.
    validateSearch: (search: { view?: string }): { view?: 'original' } => ({
      view: search.view === 'original' ? 'original' : undefined
    }),
    beforeLoad: ({ params }) => guardSection(params.section, 'preview'),
    component: PreviewExport
  })

  const settingsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/settings',
    // Always return every key: TanStack keeps the raw value of any key left out.
    validateSearch: (search: { tag?: string; back?: string }): { tag?: string; back?: string } => ({
      tag: typeof search.tag === 'string' && search.tag ? search.tag : undefined,
      // Only in-app paths ("/analysis/…"), never a full URL or a protocol-relative "//host".
      back: typeof search.back === 'string' && /^\/(?!\/)/.test(search.back) ? search.back : undefined
    }),
    component: TagStyles
  })

  const routeTree = rootRoute.addChildren([indexRoute, openRoute, sectionsRoute, analysisRoute, previewRoute, settingsRoute])
  return createRouter({ routeTree, history: options.history ?? createHashHistory() })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createFormatterRouter>
  }
}
