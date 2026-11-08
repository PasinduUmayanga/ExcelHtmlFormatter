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
export async function launchApp(): Promise<RunningApp> {
  const dir = mkdtempSync(join(tmpdir(), 'ehf-e2e-'))
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${join(dir, 'user-data')}`],
    cwd: resolve(__dirname, '..')
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

/** Opens a workbook through the real Open flow and waits for the sheet list. */
export async function openWorkbook({ app, window }: RunningApp, path: string): Promise<void> {
  await answerOpenDialog(app, path)
  await window.getByRole('button', { name: /click to browse/i }).click()
  await window.waitForURL(/#\/sections$/)
}

export const screenTitle = (window: Page) => window.locator('main h1')
