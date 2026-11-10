import { createContext, useContext, type ComponentType } from 'react'
import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  type RouterHistory
} from '@tanstack/react-router'
import type { ConvertOptions, FormatInfo } from '@hf/core'
import type { HelpSource } from './features/help/search'
import { canVisit, useApp } from './state/store'
import { AppLayout } from './design/templates'
import { Dashboard } from './screens/Dashboard'
import { Help } from './screens/Help'
import { HelpTopic } from './screens/HelpTopic'
import { Upload } from './screens/Upload'
import { Configure } from './screens/Configure'
import { Complete } from './screens/Complete'
import { Workspace } from './screens/Workspace'
import { RecentFiles } from './screens/RecentFiles'
import { Favorites } from './screens/Favorites'
import { Templates } from './screens/Templates'
import { Preferences } from './screens/Preferences'
import { Automation } from './screens/Automation'
import { PreviewExport } from './screens/PreviewExport'
import { TagStyles } from './screens/TagStyles'
import { CheckReview } from './screens/CheckReview'

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
  /** Help Center topics, in order (Markdown, ADR 0015). Leave out for no topics. */
  help?: readonly HelpSource[]
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
 *   /                      Home: choose the file type and action
 *   /upload                choose or drop a file (workflow step 3)
 *   /configure             step 4: choose sections (sheets, …) and see their tags (?tab=tags&section=X)
 *   /preview/$section      step 5: processing and preview, side by side (?view=formatted|original shows one)
 *   /check/$section        content check: issues side by side with the original (?cell=C7 selects one;
 *                          ?saved=true shows the differences found in the saved file instead)
 *   /complete              step 6: export and complete (what was saved, Open file, New task)
 *   /workspace /recent /favorites /templates /preferences /automation   the sidebar's pages
 *   /settings              tag styles (?tag=b opens one tag, ?back=/analysis/X adds a "Done" button)
 *
 * Guards send the user back to /upload or /configure when there is nothing to show.
 * Hash history is used because the packaged app is loaded from a file:// address.
 */
export function createFormatterRouter(options: { history?: RouterHistory } = {}) {
  const rootRoute = createRootRoute({ component: AppLayout })

  // Home (the start screen): start or continue, coming features, tools and recent activity.
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Dashboard })

  // The workflow is unlocked from Home; while it is locked its screens send the user there.
  const start = () => (useApp.getState().workflowActive ? '/upload' : '/')

  const uploadRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/upload',
    beforeLoad: () => {
      if (!useApp.getState().workflowActive) throw redirect({ to: '/' })
    },
    component: Upload
  })

  const configureRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/configure',
    // Always return every key: TanStack keeps the raw value of any key left out.
    validateSearch: (search: { tab?: unknown; section?: unknown }): { tab?: 'tags'; section?: string } => ({
      tab: search.tab === 'tags' ? 'tags' : undefined,
      section: typeof search.section === 'string' && search.section.length <= 200 ? search.section : undefined
    }),
    beforeLoad: () => {
      if (!canVisit(useApp.getState(), 'sections')) throw redirect({ to: start() })
    },
    component: Configure
  })

  /** Guard for the per-section preview. */
  function guardSection(section: string) {
    const state = useApp.getState()
    if (!canVisit(state, 'sections')) throw redirect({ to: start() })
    if (!canVisit(state, 'preview')) throw redirect({ to: '/configure', search: {} })
    if (!state.selected.includes(section)) {
      throw redirect({ to: '/preview/$section', params: { section: state.selected[0] }, search: {} })
    }
  }

  const previewRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/preview/$section',
    // Always return every key: TanStack keeps the raw value of any key left out.
    // No view: original and formatted side by side.
    validateSearch: (search: { view?: string }): { view?: 'original' | 'formatted' } => ({
      view: search.view === 'original' || search.view === 'formatted' ? search.view : undefined
    }),
    beforeLoad: ({ params }) => guardSection(params.section),
    component: PreviewExport
  })

  const checkRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/check/$section',
    // Always return every key: TanStack keeps the raw value of any key left out.
    validateSearch: (search: { cell?: unknown; saved?: unknown }): { cell?: string; saved?: true } => ({
      // A cell address or similar locator: short, letters, digits and a few separators only.
      cell: typeof search.cell === 'string' && /^[A-Za-z0-9$:!._-]{1,40}$/.test(search.cell) ? search.cell : undefined,
      saved: search.saved === true || search.saved === 'true' ? true : undefined
    }),
    beforeLoad: ({ params, search }) => {
      const state = useApp.getState()
      if (!canVisit(state, 'sections')) throw redirect({ to: start() })
      if (!canVisit(state, 'preview')) throw redirect({ to: '/configure', search: {} })
      const known = state.doc!.sections.some((s) => s.name === params.section)
      // The saved-file view needs a saved file; the content check needs a selected section.
      if (search.saved ? !state.exportResult?.verification || !known : !state.selected.includes(params.section)) {
        throw redirect({ to: '/preview/$section', params: { section: state.selected[0] } })
      }
    },
    component: CheckReview
  })

  // Export & complete: before a save it needs something to save; after a clean save it shows what was saved.
  const completeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/complete',
    beforeLoad: () => {
      const state = useApp.getState()
      if (state.lastSaved && !state.doc) return
      if (!canVisit(state, 'sections')) throw redirect({ to: start() })
      if (!canVisit(state, 'preview')) throw redirect({ to: '/configure', search: {} })
    },
    component: Complete
  })

  const workspaceRoute = createRoute({ getParentRoute: () => rootRoute, path: '/workspace', component: Workspace })
  const recentRoute = createRoute({ getParentRoute: () => rootRoute, path: '/recent', component: RecentFiles })
  const favoritesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/favorites', component: Favorites })
  const templatesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/templates', component: Templates })
  const preferencesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/preferences',
    component: Preferences
  })
  const automationRoute = createRoute({ getParentRoute: () => rootRoute, path: '/automation', component: Automation })

  const settingsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/settings',
    // Always return every key: TanStack keeps the raw value of any key left out.
    validateSearch: (search: { tag?: string; back?: string }): { tag?: string; back?: string } => ({
      tag: typeof search.tag === 'string' && search.tag ? search.tag : undefined,
      // Only in-app paths ("/configure?…"), never a full URL or a protocol-relative "//host".
      back: typeof search.back === 'string' && /^\/(?!\/)/.test(search.back) ? search.back : undefined
    }),
    component: TagStyles
  })

  const helpRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/help',
    // Always return every key: TanStack keeps the raw value of any key left out.
    validateSearch: (search: { q?: unknown }): { q?: string } => ({
      q: typeof search.q === 'string' && search.q.length <= 200 ? search.q : undefined
    }),
    component: Help
  })

  const helpTopicRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/help/$topic',
    // Always return every key. `section` is a heading anchor (letters, digits, hyphens).
    validateSearch: (search: { section?: unknown }): { section?: string } => ({
      section:
        typeof search.section === 'string' && /^[a-z0-9-]{1,80}$/.test(search.section) ? search.section : undefined
    }),
    component: HelpTopic
  })

  const routeTree = rootRoute.addChildren([
    indexRoute,
    uploadRoute,
    configureRoute,
    previewRoute,
    checkRoute,
    completeRoute,
    workspaceRoute,
    recentRoute,
    favoritesRoute,
    templatesRoute,
    preferencesRoute,
    automationRoute,
    settingsRoute,
    helpRoute,
    helpTopicRoute
  ])
  return createRouter({ routeTree, history: options.history ?? createHashHistory() })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createFormatterRouter>
  }
}
