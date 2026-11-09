import { join } from 'node:path'

/**
 * The settings folder to use instead of Electron's default (which is named after the product), or null to
 * keep the default. Apps pass their earlier folder name here, so renaming the product doesn't lose saved
 * settings. A `--user-data-dir` switch (used by the e2e tests) always wins.
 */
export function userDataPath(appData: string, folder: string | undefined, hasUserDataSwitch: boolean): string | null {
  if (!folder || hasUserDataSwitch) return null
  // A folder name, never a path: it comes from the app's code, but keep it from pointing anywhere else.
  if (/[\\/]/.test(folder) || folder.trim() === '' || folder === '.' || folder === '..') {
    throw new Error(`The settings folder must be a plain folder name: ${folder}`)
  }
  return join(appData, folder)
}
