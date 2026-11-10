/// <reference path="./env.d.ts" />
/// <reference path="./css.d.ts" />
// @hf/ui: the shared window (React) for every formatter app.
// An app only supplies its FormatInfo and a Preview component:
//
//   mountFormatterApp(document.getElementById('root')!, { format: excelFormat, Preview: SheetGrid })
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { createFormatterRouter, FormatterAppProvider, type FormatterAppConfig } from './router'
// Inter (SIL Open Font License), bundled so the app looks the same on every computer; see styles/tokens.css.
import '@fontsource-variable/inter'
import './styles/styles.css'

export function FormatterApp({ config }: { config: FormatterAppConfig }) {
  const [router] = useState(() => createFormatterRouter())
  return (
    <FormatterAppProvider value={config}>
      <RouterProvider router={router} />
    </FormatterAppProvider>
  )
}

export function mountFormatterApp(root: HTMLElement, config: FormatterAppConfig): void {
  createRoot(root).render(
    <StrictMode>
      <FormatterApp config={config} />
    </StrictMode>
  )
}

export {
  createFormatterRouter,
  useFormatterApp,
  type FormatterAppConfig,
  type PreviewProps,
  type PreviewView
} from './router'
export { useApp, canVisit, cleanError } from './state/store'
export type { HelpSource } from './features/help/search'
export { RichText } from './design/molecules'
export { JobProgressPanel } from './design/organisms'
export { useConversion } from './hooks/useConversion'
export { linkTitle } from './utils/linkTitle'
export { styleToCss } from './utils/styleToCss'
export { describeProgress } from './utils/describeProgress'
