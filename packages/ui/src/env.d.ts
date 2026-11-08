import type { ElectronApi } from '@hf/core'

declare global {
  interface Window {
    /** Exposed by @hf/desktop/preload */
    api: ElectronApi
  }
}

export {}
