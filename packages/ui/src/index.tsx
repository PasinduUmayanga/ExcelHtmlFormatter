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
import './styles.css'

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
export { useApp, canVisit, cleanError } from './store'
export { RichText } from './components/RichText'
export { styleToCss } from './components/styleToCss'
export { JobProgressPanel, describeProgress } from './components/JobProgress'
