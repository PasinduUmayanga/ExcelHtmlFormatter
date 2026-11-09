/// <reference types="vite/client" />
// The Help Center's topics for the Excel app, in order (ADR 0015). The text lives in ../../help/*.md,
// so it also reads well on GitHub; Vite includes each file as a string.
import type { HelpSource } from '@hf/ui'
import gettingStarted from '../../help/getting-started.md?raw'
import userGuide from '../../help/user-guide.md?raw'
import faq from '../../help/faq.md?raw'
import troubleshooting from '../../help/troubleshooting.md?raw'
import about from '../../help/about.md?raw'

export const help: HelpSource[] = [
  { id: 'getting-started', markdown: gettingStarted },
  { id: 'user-guide', markdown: userGuide },
  { id: 'faq', markdown: faq },
  { id: 'troubleshooting', markdown: troubleshooting },
  { id: 'about', markdown: about, appInfo: true }
]
