import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/** The committed sample workbook (5 sheets, tricky cells). */
export const SAMPLE = resolve(__dirname, '../../../packages/adapter-excel/samples/product_catalog.xlsx')

export interface RunningApp {
  app: ElectronApplication
  window: Page
  /** A fresh temporary folder for this run (settings live in <dir>/user-data) */
  dir: string
}

/**
 * Starts the built app (run `pnpm build` first) with its own settings folder,
 * so tests never touch the user's real settings.
 */
export async function launchApp(reuseDir?: string): Promise<RunningApp> {
  // reuseDir: start again with the same settings folder (to test what survives a restart).
  const dir = reuseDir ?? mkdtempSync(join(tmpdir(), 'ehf-e2e-'))
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${join(dir, 'user-data')}`],
    cwd: resolve(__dirname, '..'),
    // No light/dark emulation: the app's own theme (Electron's nativeTheme) decides, as for users.
    colorScheme: null
  })
  const window = await app.firstWindow()
  await window.waitForSelector('main h1')
  return { app, window, dir }
}

/** Makes the next Open dialogs return `path` (replaces the native dialog inside the main process). */
export async function answerOpenDialog(app: ElectronApplication, path: string): Promise<void> {
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [file] })) as typeof dialog.showOpenDialog
  }, path)
}

/** Makes the next Save dialogs return `path`. */
export async function answerSaveDialog(app: ElectronApplication, path: string): Promise<void> {
  await app.evaluate(({ dialog }, file) => {
    dialog.showSaveDialog = (async () => ({ canceled: false, filePath: file })) as typeof dialog.showSaveDialog
  }, path)
}

/**
 * Opens a workbook the way users do: on Home, Excel and "Format HTML tags" are chosen, Continue unlocks the
 * workflow; on Upload, Choose file, then Continue once the file is read. Waits for Configure (the sheet list).
 */
export async function openWorkbook({ app, window }: RunningApp, path: string): Promise<void> {
  await answerOpenDialog(app, path)
  await window.getByRole('link', { name: 'Home', exact: true }).click()
  await window.getByRole('button', { name: 'Continue', exact: true }).click()
  await window.waitForURL(/#\/upload$/)
  await window.getByRole('button', { name: 'Choose file' }).click()
  await window.getByRole('status', { name: 'Chosen file' }).waitFor()
  await window.getByRole('button', { name: 'Continue →' }).click()
  await window.waitForURL(/#\/configure$/)
}

/** My Workspace in the sidebar: says "Active" while the workflow is unlocked (FR-29). */
export const workspaceNav = (window: Page) => window.locator('aside .nav', { hasText: 'My Workspace' })

/** Makes the next Open dialog report the folder it was asked to start in, then cancel. */
export async function recordOpenDialogFolder(app: ElectronApplication): Promise<() => Promise<string | undefined>> {
  await app.evaluate(({ dialog }) => {
    const g = globalThis as { lastOpenFolder?: string }
    dialog.showOpenDialog = (async (...args: unknown[]) => {
      const options = args.at(-1) as Electron.OpenDialogOptions
      g.lastOpenFolder = options.defaultPath
      return { canceled: true, filePaths: [] }
    }) as typeof dialog.showOpenDialog
  })
  return () => app.evaluate(() => (globalThis as { lastOpenFolder?: string }).lastOpenFolder)
}

export const screenTitle = (window: Page) => window.locator('main h1')

/** From Preview to Export & complete (step 6), where the file is saved. */
export async function toExport(window: Page): Promise<void> {
  await window.getByRole('button', { name: 'Continue →' }).click()
  await window.waitForURL(/#\/complete$/)
}
