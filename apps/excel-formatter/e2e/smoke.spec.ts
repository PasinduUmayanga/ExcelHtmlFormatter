// End-to-end smoke tests: the real built app, driven like a user.
// Run with `pnpm test:e2e` from the repo root (builds the app first).
import { test, expect } from '@playwright/test'
import ExcelJS from 'exceljs'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  answerSaveDialog,
  launchApp,
  openWorkbook,
  recordOpenDialogFolder,
  workspaceNav,
  answerOpenDialog,
  toExport,
  SAMPLE,
  screenTitle,
  type RunningApp
} from './fixtures'

let run: RunningApp
test.beforeEach(async () => {
  run = await launchApp()
})
test.afterEach(async () => {
  await run.app.close()
})

const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')

test('starts on Home with the document steps locked', async () => {
  const { app, window, dir } = run
  await expect(window).toHaveTitle('FormaFlow')
  await expect(window.locator('.brand')).toContainText('FormaFlow')
  // The test's own settings folder wins over the kept "Excel HTML Formatter" folder.
  expect(await app.evaluate(({ app }) => app.getPath('userData'))).toBe(join(dir, 'user-data'))
  await expect(screenTitle(window)).toHaveText('Welcome to FormaFlow')
  await expect(window).toHaveURL(/index\.html(#\/)?$/)
  // Every page in the sidebar is there; Automation is marked Beta and only says it is planned.
  await window
    .locator('aside')
    .getByRole('link', { name: /Automation/ })
    .click()
  await expect(screenTitle(window)).toHaveText('Automation (Beta)')
  await expect(window.getByRole('status').filter({ hasText: 'Planned for a future release' })).toBeVisible()
  await window.locator('aside').getByRole('link', { name: 'Settings' }).click()
  await expect(screenTitle(window)).toHaveText('Settings')
  await expect(window.locator('main')).toContainText('Your original file is never changed or overwritten')
  // Search (Ctrl+K) finds pages, actions and help, and goes there
  await window.keyboard.press('Control+K')
  const search = window.getByRole('combobox', { name: 'Search files, actions, or help' })
  await expect(search).toBeFocused()
  await search.fill('home')
  await expect(window.getByRole('listbox', { name: 'Search results' })).toBeVisible()
  await search.press('Enter')
  await expect(screenTitle(window)).toHaveText('Welcome to FormaFlow')
  await expect(window.getByRole('status', { name: 'Active formatting profile' })).toContainText('Default Profile')
  // Step 1: Excel is chosen; step 2 offers only what this app does, the rest is "Coming soon".
  const types = window.getByRole('radiogroup', { name: 'File type' })
  await expect(types.getByRole('radio', { name: /Excel/ })).toHaveAttribute('aria-checked', 'true')
  // Only the extension the app really opens (no .xls: ExcelJS can't read it).
  await expect(types.getByRole('radio', { name: /Excel/ }).locator('.card-ext')).toHaveText('.xlsx')
  const actions = window.getByRole('radiogroup', { name: 'Action for Excel' })
  await expect(actions.getByRole('radio', { name: /Format HTML tags/ })).toHaveAttribute('aria-checked', 'true')
  await expect(actions.getByRole('radio', { name: /Convert to PDF/ })).toHaveAttribute('aria-disabled', 'true')
  await expect(actions.getByRole('radio', { name: /Convert to PDF/ })).toContainText('Coming soon')
  const go = window.getByRole('button', { name: 'Continue', exact: true })
  await expect(go).toBeEnabled()
  // Word has nothing ready yet: no action can be chosen and Continue says why.
  await types.getByRole('radio', { name: /Word/ }).click()
  const wordActions = window.getByRole('radiogroup', { name: 'Action for Word' })
  await expect(wordActions.getByRole('radio', { checked: true })).toHaveCount(0)
  await expect(go).toBeDisabled()
  await expect(window.locator('.continue-row')).toContainText('coming soon')
  // Arrow keys move the choice; back to Excel brings its action back.
  await types.getByRole('radio', { name: /Word/ }).press('ArrowLeft')
  await expect(types.getByRole('radio', { name: /Excel/ })).toHaveAttribute('aria-checked', 'true')
  await expect(types.getByRole('radio', { name: /Excel/ })).toBeFocused()
  await expect(go).toBeEnabled()
  await expect(window.locator('.recent')).toContainText('Nothing yet')
  // The whole workflow is locked until an item is picked on Home, also when typing an address.
  await expect(workspaceNav(window)).not.toContainText('Active')
  await window.evaluate(() => (location.hash = '#/upload'))
  await expect(window).toHaveURL(/#\/$/)
  await go.click()
  await expect(window).toHaveURL(/#\/upload$/)
  await expect(workspaceNav(window)).toContainText('Active')

  // Upload: the six-step bar, the summary, Load sample and Remove.
  const steps = window.getByRole('navigation', { name: 'Workflow progress' })
  await expect(steps.locator('[aria-current="step"]')).toContainText('Upload')
  await expect(steps.locator('li').nth(0)).toContainText('Excel')
  await expect(steps.locator('li').nth(1)).toContainText('Format HTML tags')
  const next = window.getByRole('button', { name: 'Continue →' })
  await expect(next).toBeDisabled()
  await window.getByRole('button', { name: 'Load sample' }).click()
  const chosen = window.getByRole('status', { name: 'Chosen file' })
  await expect(chosen).toContainText('product_catalog.xlsx')
  await expect(chosen).toContainText('6 sheets')
  await expect(window.locator('.summary')).toContainText('product_catalog.xlsx')
  await expect(next).toBeEnabled()
  await chosen.getByRole('button', { name: 'Remove' }).click()
  await expect(chosen).toHaveCount(0)
  await expect(window.locator('.summary')).toContainText('Not selected')
  await expect(next).toBeDisabled()
})

test('open → analyse → set a style → preview → export a formatted copy', async () => {
  const { app, window, dir } = run
  const before = hash(SAMPLE)

  await openWorkbook(run, SAMPLE)
  await expect(screenTitle(window)).toHaveText('Configure processing')
  await expect(window.locator('.config-area')).toContainText('6 sheets found in product_catalog.xlsx')
  await expect(window.locator('.config-area')).toContainText('4 contain HTML and are selected for you')
  const steps = window.getByRole('navigation', { name: 'Workflow progress' })
  await expect(steps.locator('[aria-current="step"]')).toContainText('Configure')
  await expect(steps.locator('li').nth(3)).toContainText('4 of 6 sheets')

  await window.getByRole('link', { name: 'Tag Styles' }).click()
  await expect(window).toHaveURL(/#\/configure\?tab=tags&section=Products$/)
  await window.getByRole('tab', { name: /Science/ }).click()
  await expect(window).toHaveURL(/#\/configure\?tab=tags&section=Science$/)
  // <span> has no rule but a built-in look: it is not reported as missing.
  await expect(window.locator('tr', { hasText: '<span>' })).toContainText('Default')
  await expect(window.locator('.stat').last()).toContainText('0')

  // Change the look of <mark> (italic on top of its default) and come back.
  await window.getByRole('tab', { name: /Formatting/ }).click()
  await window.locator('tr', { hasText: '<mark>' }).getByRole('button', { name: 'Edit' }).click()
  await expect(window).toHaveURL(/#\/settings\?tag=mark&back=%2Fconfigure%3Ftab%3Dtags%26section%3DFormatting$/)
  await window.locator('button[title="Italic"]').click()
  await window.getByRole('button', { name: /Done, back to Configure/ }).click()
  await expect(window).toHaveURL(/#\/configure\?tab=tags&section=Formatting$/)

  await window.getByRole('button', { name: 'Continue →' }).click()
  await expect(window).toHaveURL(/#\/preview\/Formatting$/)
  // The content check runs by itself: nothing lost, 2 notes (the unsafe and the extra link).
  await expect(window.locator('.check-chip')).toContainText('all 41 cells complete', { timeout: 30_000 })
  await expect(window.locator('.check-chip')).toContainText('2 notes')
  await expect(window.locator('td.filled')).toHaveText('Sold out')
  await window.getByRole('radio', { name: 'Original HTML' }).click()
  await expect(window).toHaveURL(/view=original/)
  await expect(window.locator('.grid')).toContainText('<mark>Sold out</mark>')

  const target = join(dir, 'formatted.xlsx')
  await toExport(window)
  await expect(
    window.getByRole('navigation', { name: 'Workflow progress' }).locator('[aria-current="step"]')
  ).toContainText('Export')
  // The output name is where the Save dialog starts (folders and odd characters are dropped).
  await window.getByLabel('Output name').fill('catalog: final')
  await app.evaluate(({ dialog }, file) => {
    dialog.showSaveDialog = (async (...args: unknown[]) => {
      ;(globalThis as { saveName?: string }).saveName = (args.at(-1) as Electron.SaveDialogOptions).defaultPath
      return { canceled: false, filePath: file }
    }) as typeof dialog.showSaveDialog
  }, target)
  await window.getByRole('button', { name: /Save formatted file/ }).click()
  // A clean save ends the workflow on Export & complete, with the summary, and the steps locked again.
  await expect(window).toHaveURL(/#\/complete$/, { timeout: 30_000 })
  expect(await app.evaluate(() => (globalThis as { saveName?: string }).saveName)).toBe(
    join(dirname(SAMPLE), 'catalog final.xlsx')
  )
  await expect(window.getByRole('heading', { name: 'Processing completed!' })).toBeVisible()
  await expect(window.getByRole('button', { name: 'Open file' })).toBeVisible()
  await expect(window.getByLabel('Summary', { exact: true })).toContainText('product_catalog.xlsx')
  const success = window.locator('.success')
  await expect(success).toContainText('Saved formatted.xlsx')
  await expect(success).toContainText('41 cells formatted in 4 sheets, 9 set to wrap text')
  await expect(success).toContainText('2 links added, 2 links not added')
  await expect(success).toContainText('1 cell highlighted')
  await expect(success).toContainText('Verified: the saved file matches')
  await expect(workspaceNav(window)).not.toContainText('Active')
  await expect(window.getByRole('button', { name: 'Continue →' })).toHaveCount(0)
  await success.getByRole('button', { name: 'Dismiss' }).click()
  await expect(success).toHaveCount(0)
  await expect(window).toHaveURL(/#\/$/)

  // The saved file has real rich text, links and fill, and the original is byte-for-byte unchanged.
  const saved = new ExcelJS.Workbook()
  await saved.xlsx.readFile(target)
  expect(saved.getWorksheet('Team')!.getCell('A2').value).toEqual({
    richText: [{ text: 'my name', font: { bold: true } }, { text: ' is ' }, { text: 'pasindu', font: { italic: true } }]
  })
  expect(saved.getWorksheet('Products')!.getCell('C3').alignment?.wrapText).toBe(true)
  const formatting = saved.getWorksheet('Formatting')!
  expect(formatting.getCell('B6').hyperlink).toBe('https://example.com/tea')
  expect(formatting.getCell('B7').hyperlink).toBeUndefined()
  expect(formatting.getCell('B9').fill).toMatchObject({ pattern: 'solid', fgColor: { argb: 'FFFFFF00' } })
  const marked = (formatting.getCell('B9').value as ExcelJS.CellRichTextValue).richText[0]
  expect(marked.font).toMatchObject({ bold: true, italic: true, color: { argb: 'FFB45309' } })
  expect(hash(SAMPLE)).toBe(before)
})

test('a content issue stops the save until "Save anyway", with a CSV report', async () => {
  const { app, window, dir } = run
  const file = join(dir, 'long.xlsx')
  const wb = new ExcelJS.Workbook()
  const sheet = wb.addWorksheet('Long')
  sheet.getCell('A1').value = `<b>${'x'.repeat(33_000)}</b>` // over Excel's 32,767-character cell limit
  sheet.getCell('A2').value = '<i>fine</i>'
  await wb.xlsx.writeFile(file)

  await openWorkbook(run, file)
  await window.getByRole('button', { name: 'Continue →' }).click()
  await expect(window.locator('.check-chip')).toContainText('1 cell needs review', { timeout: 30_000 })

  // Save stops at the compare screen; nothing is written.
  const target = join(dir, 'long-formatted.xlsx')
  await answerSaveDialog(app, target)
  await toExport(window)
  await window.getByRole('button', { name: /Save formatted file/ }).click()
  await expect(window).toHaveURL(/#\/check\/Long\?cell=A1$/)
  await expect(window.locator('.check-row.active')).toContainText('Too long for one cell: 233 characters over')
  expect(existsSync(target)).toBe(false)

  // Keyboard navigation stays within the list (only one issue here).
  await window.getByRole('listbox', { name: 'Items to review' }).press('ArrowDown')
  await expect(window).toHaveURL(/cell=A1$/)

  const csv = join(dir, 'report.csv')
  await answerSaveDialog(app, csv)
  await window.getByRole('button', { name: 'Export report (CSV)' }).click()
  await expect(window.locator('.toast')).toHaveText('Saved the report as report.csv')
  expect(readFileSync(csv, 'utf8')).toContain(
    'Long,A1,issue,limit,"Too long for one cell: 233 characters over the 32,767 limit"'
  )

  await answerSaveDialog(app, target)
  await window.getByRole('button', { name: /Save anyway \(1 issue\)/ }).click()
  await window.getByRole('alertdialog').getByRole('button', { name: 'Save anyway' }).click()
  // A save with a known issue keeps the file open (on Export & complete), so the issue can still be reviewed.
  await expect(window).toHaveURL(/#\/complete$/)
  await expect(window.locator('.success')).toContainText('Saved with 1 known issue', { timeout: 30_000 })
  await expect(workspaceNav(window)).toContainText('Active')
  await expect(window.locator('.success')).toContainText('Verified: the saved file matches')
  expect(existsSync(target)).toBe(true)
})

test('refuses to overwrite the original file', async () => {
  const { app, window } = run
  const before = hash(SAMPLE)
  await openWorkbook(run, SAMPLE)
  await window.getByRole('button', { name: 'Continue →' }).click()
  await answerSaveDialog(app, SAMPLE.toUpperCase())
  await toExport(window)
  await window.getByRole('button', { name: /Save formatted file/ }).click()
  await expect(window.locator('.error')).toContainText('The original file is never overwritten')
  expect(hash(SAMPLE)).toBe(before)
})

/** 60,000 HTML cells: big enough that saving and checking take a few seconds. */
async function writeBigWorkbook(path: string): Promise<void> {
  const writer = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: path, useSharedStrings: true })
  const sheet = writer.addWorksheet('Products')
  for (let i = 1; i <= 15_000; i++) {
    sheet.addRow([`<b>P${i}</b>`, `A <i>fine</i> item ${i}`, `<u>x</u><br>y`, `x<sup>2</sup>`]).commit()
  }
  sheet.commit()
  await writer.commit()
}

test('Cancel stops a large export and leaves no file behind', async () => {
  const { app, window, dir } = run
  const big = join(dir, 'big.xlsx')
  await writeBigWorkbook(big)

  await openWorkbook(run, big)
  await window.getByRole('button', { name: 'Continue →' }).click()
  const outDir = join(dir, 'out')
  await answerSaveDialog(app, join(outDir, 'cancelled.xlsx'))
  await toExport(window)
  await window.getByRole('button', { name: /Save formatted file/ }).click()
  await expect(window.locator('.job')).toBeVisible()
  await window.locator('.job').getByRole('button', { name: 'Cancel' }).click()

  await expect(window.locator('.toast')).toHaveText('Saving stopped. No file was written.')
  await expect(window.locator('.job')).toHaveCount(0)
  await expect(window.locator('.success')).toHaveCount(0)
  expect(existsSync(outDir) ? readdirSync(outDir) : []).toEqual([])
})

test('Cancel while checking the saved file keeps the file and skips only the check', async () => {
  const { app, window, dir } = run
  const big = join(dir, 'big.xlsx')
  await writeBigWorkbook(big)

  await openWorkbook(run, big)
  await window.getByRole('button', { name: 'Continue →' }).click()
  const target = join(dir, 'verified.xlsx')
  await answerSaveDialog(app, target)
  // The check of the saved file can take under a second, too short to click reliably: cancel through the
  // window's own API (what the Cancel button calls) as soon as that stage starts.
  await window.evaluate(() => {
    const api = (window as unknown as { api: import('@hf/core').ElectronApi }).api
    const stop = api.onJobProgress((kind, progress) => {
      if (kind === 'export' && progress.stage === 'verifying') {
        stop()
        void api.cancelJob('export')
      }
    })
  })
  await toExport(window)
  await window.getByRole('button', { name: /Save formatted file/ }).click()

  // The file is saved, so this is a completed save: Export & complete says the saved file wasn't checked.
  await expect(window).toHaveURL(/#\/complete$/, { timeout: 30_000 })
  await expect(window.locator('.success')).toContainText('Saved verified.xlsx')
  await expect(window.locator('.success')).toContainText('The saved file was not checked (stopped).')
  expect(existsSync(target)).toBe(true)
})

test('Home: Continue mid-workflow, recent activity, Open again in that folder, Clear survives a restart', async () => {
  const { app, window, dir } = run
  await openWorkbook(run, SAMPLE)
  await window.getByRole('button', { name: 'Continue →' }).click()
  await expect(window.locator('.check-chip')).toContainText('complete', { timeout: 30_000 })

  // Going Home mid-workflow keeps it unlocked; Continue returns to the screen the user was on.
  await window.getByRole('link', { name: 'Home', exact: true }).click()
  await expect(workspaceNav(window)).toContainText('Active')
  await window.getByRole('button', { name: 'Continue →' }).click()
  await expect(window).toHaveURL(/#\/preview\/Products$/)

  await answerSaveDialog(app, join(dir, 'formatted.xlsx'))
  await toExport(window)
  await window.getByRole('button', { name: /Save formatted file/ }).click()
  await expect(window).toHaveURL(/#\/complete$/, { timeout: 30_000 })
  await expect(window.locator('.success')).toContainText('Verified')
  await window.getByRole('button', { name: 'Back to Home →' }).click()

  const rows = window.locator('.activity li')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0)).toContainText('formatted.xlsx')
  await expect(rows.nth(0)).toContainText('Formatted')
  await expect(rows.nth(0).locator('.activity-status')).toHaveAttribute(
    'title',
    /41 cells formatted · saved file verified/
  )
  await expect(rows.nth(1)).toContainText('product_catalog.xlsx')
  await expect(rows.nth(1)).toContainText('Opened')

  // Open again unlocks the workflow and starts the dialog in that folder.
  const folder = await recordOpenDialogFolder(app)
  await rows
    .nth(0)
    .getByRole('button', { name: /Open again/ })
    .click()
  await expect.poll(folder).toBe(dir)
  await expect(workspaceNav(window)).toContainText('Active')

  // My Workspace shows the task; a star keeps a file in Favorites, which outlive Clear.
  await workspaceNav(window).click()
  await expect(window.locator('.session')).toContainText('Step 3 of 6: Upload')
  await window.locator('aside').getByRole('link', { name: 'Recent Files' }).click()
  await window.getByRole('button', { name: 'Favorite formatted.xlsx' }).click()
  await expect(window.getByRole('button', { name: 'Favorite formatted.xlsx' })).toHaveAttribute('aria-pressed', 'true')
  await window.locator('aside').getByRole('link', { name: 'Favorites' }).click()
  await expect(window.locator('.favorites li')).toHaveCount(1)
  await expect(window.locator('.favorites li')).toContainText('formatted.xlsx')

  await window.locator('aside').getByRole('link', { name: 'Recent Files' }).click()
  await window.getByRole('button', { name: 'Clear' }).click()
  // Clear asks first
  const confirm = window.getByRole('alertdialog', { name: 'Clear recent activity' })
  await confirm.getByRole('button', { name: 'Cancel' }).click()
  await expect(window.locator('.activity li')).toHaveCount(2)
  await window.getByRole('button', { name: 'Clear' }).click()
  await confirm.getByRole('button', { name: 'Clear' }).click()
  await expect(window.locator('.recent')).toContainText('Nothing yet')
  await app.close()
  run = await launchApp(dir)
  await expect(run.window.locator('.recent')).toContainText('Nothing yet')
  await run.window.locator('aside').getByRole('link', { name: 'Favorites' }).click()
  await expect(run.window.locator('.favorites li')).toContainText('formatted.xlsx')
})

test('Formatting Profiles: create, use, rename and delete; the active one is used everywhere', async () => {
  const { app, window, dir } = run
  await window.locator('aside').getByRole('link', { name: 'Formatting Profiles' }).click()
  await expect(screenTitle(window)).toHaveText('Formatting Profiles')
  const list = window.locator('.profile-list li')
  await expect(list).toHaveCount(1)
  await expect(list.first()).toContainText('Default')
  await expect(list.first()).toContainText('Active')

  await window.getByLabel('New profile name').fill('Client A')
  await window.getByRole('button', { name: 'Create a profile' }).click()
  await expect(list).toHaveCount(2)
  // A name already used is refused, with the reason
  await window.getByLabel('New profile name').fill('client a')
  await window.getByRole('button', { name: 'Create a profile' }).click()
  await expect(window.locator('.error')).toContainText('There is already a profile called "client a"')

  await list.filter({ hasText: 'Client A' }).getByRole('button', { name: 'Use' }).click()
  await expect(window.getByRole('heading', { name: 'Tag styles in Client A' })).toBeVisible()
  await expect(window.getByRole('status', { name: 'Active formatting profile' })).toContainText('Client A Profile')
  await expect(list.filter({ hasText: 'Default' }).getByRole('button', { name: 'Delete Default' })).toHaveCount(0)

  // Configure offers the same profiles
  await openWorkbook(run, SAMPLE)
  await window.getByRole('link', { name: 'Tag Styles' }).click()
  await expect(window.getByLabel('Active profile')).toHaveValue('Client A')
  await window.getByLabel('Active profile').selectOption('Default')
  await expect(window.getByRole('status', { name: 'Active formatting profile' })).toContainText('Default Profile')

  await window.locator('aside').getByRole('link', { name: 'Formatting Profiles' }).click()
  await window.getByRole('button', { name: 'Rename Client A' }).click()
  await window.getByLabel('New name for Client A').fill('Client B')
  await window.getByRole('button', { name: 'Save' }).click()
  await expect(list.filter({ hasText: 'Client B' })).toHaveCount(1)
  await window.getByRole('button', { name: 'Delete Client B' }).click()
  await window.getByRole('alertdialog', { name: 'Delete profile' }).getByRole('button', { name: 'Delete' }).click()
  await expect(list).toHaveCount(1)

  // Templates: a saved setup starts a task in one click (here: every sheet ticked)
  await window.getByRole('link', { name: 'Home', exact: true }).click()
  await window.getByRole('button', { name: /Use a Template/ }).click()
  await expect(screenTitle(window)).toHaveText('Templates')
  await window.getByLabel('Name').fill('Weekly, all sheets')
  await window.getByLabel('Tick sheets').selectOption('all')
  await window.getByRole('button', { name: 'Save template' }).click()
  await expect(window.locator('.template-list li')).toContainText('Weekly, all sheets')
  await answerOpenDialog(app, SAMPLE)
  await window.getByRole('button', { name: 'Use Weekly, all sheets' }).click()
  await expect(window).toHaveURL(/#\/upload$/)
  await window.getByRole('button', { name: 'Choose file' }).click()
  await window.getByRole('status', { name: 'Chosen file' }).waitFor()
  await window.getByRole('button', { name: 'Continue →' }).click()
  await expect(window.getByRole('navigation', { name: 'Workflow progress' }).locator('li').nth(3)).toContainText(
    '6 of 6 sheets'
  )

  // The active profile survives a restart
  await app.close()
  run = await launchApp(dir)
  await expect(run.window.getByRole('status', { name: 'Active formatting profile' })).toContainText('Default Profile')
})

test('the theme choice applies to the whole app and survives a restart', async () => {
  const { app, window, dir } = run
  const theme = window.getByRole('radiogroup', { name: 'Theme' })
  await expect(theme.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true')

  await theme.getByRole('radio', { name: 'Dark' }).click()
  await expect.poll(() => app.evaluate(({ nativeTheme }) => nativeTheme.themeSource)).toBe('dark')
  await expect.poll(() => window.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)).toBe(true)

  await app.close()
  run = await launchApp(dir)
  const again = run.window.getByRole('radiogroup', { name: 'Theme' })
  await expect(again.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
  expect(
    await run.app.evaluate(({ nativeTheme }) => [nativeTheme.themeSource, nativeTheme.shouldUseDarkColors])
  ).toEqual(['dark', true])
  // The window was created in the dark background, so it never flashes white while loading.
  expect(await run.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBackgroundColor())).toBe(
    '#0B172A'
  )

  await again.getByRole('radio', { name: 'Light' }).click()
  await expect.poll(() => run.window.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)).toBe(false)
})

test('Help: topics by keyboard, search, links between topics and About', async () => {
  const { window } = run
  // From the header, by keyboard.
  await window.getByRole('link', { name: 'Help', exact: true }).focus()
  await window.keyboard.press('Enter')
  await expect(screenTitle(window)).toHaveText('Help')
  // The header search also finds help topics
  await window.getByRole('combobox', { name: 'Search files, actions, or help' }).fill('line breaks')
  const option = window.getByRole('option', { name: /User guide › Line breaks/ })
  await expect(option).toBeVisible()
  await option.click()
  await expect(window).toHaveURL(/#\/help\/user-guide\?section=/)
  await window.getByRole('link', { name: 'Help', exact: true }).click()
  for (const name of ['Getting started', 'User guide', 'FAQs', 'Troubleshooting', 'About']) {
    await expect(window.getByRole('region', { name })).toBeVisible()
  }

  const search = window.getByRole('searchbox', { name: 'Search help' })
  await search.fill('wrap')
  await expect(window).toHaveURL(/#\/help\?q=wrap$/)
  await expect(window.getByRole('status').filter({ hasText: 'for “wrap”' })).toBeVisible()
  const lineBreaks = window.getByRole('link', { name: 'User guide › Line breaks, lists and tables' })
  await expect(lineBreaks).toBeVisible()
  await expect(window.locator('.help-excerpt mark').first()).toHaveText(/wrap/i)
  await lineBreaks.click()
  await expect(window).toHaveURL(/#\/help\/user-guide\?section=line-breaks-lists-and-tables$/)
  await expect(window.locator('#line-breaks-lists-and-tables')).toBeInViewport()

  // Back keeps the search; a search with no match says so.
  await window.goBack()
  await expect(search).toHaveValue('wrap')
  await search.fill('zzzz')
  await expect(window.getByRole('status').filter({ hasText: 'No results for “zzzz”' })).toBeVisible()

  // A link inside a topic goes to another topic's section; About shows the real app details.
  await window.getByRole('link', { name: 'Open FAQs' }).click()
  await window.locator('.markdown').getByRole('link', { name: 'Tag styles' }).click()
  await expect(window).toHaveURL(/#\/help\/user-guide\?section=tag-styles$/)
  await window.getByRole('link', { name: 'Help', exact: true }).click()
  await window.getByRole('link', { name: 'Open About' }).click()
  await expect(window.locator('.app-details')).toContainText('0.1.0')
  await expect(window.locator('.app-details')).toContainText('config.json')

  // Home links here too.
  await window.getByRole('link', { name: 'Home', exact: true }).click()
  await window.getByRole('link', { name: 'Help & Support' }).click()
  await expect(screenTitle(window)).toHaveText('Help')
})

test('start-up: a failure to load the settings shows Try again, which recovers', async () => {
  const { app, window } = run
  await expect(screenTitle(window)).toHaveText('Welcome to FormaFlow')
  // Make loading the settings fail, then start the window again.
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('config:load')
    ipcMain.handle('config:load', () => {
      throw new Error('Disk not ready')
    })
  })
  await window.reload()
  const alert = window.getByRole('alert')
  await expect(alert).toContainText('Your settings could not be loaded.')
  await expect(alert).toContainText('Disk not ready')
  await expect(window.locator('aside')).toHaveCount(0)

  // Settings readable again: Try again opens the app.
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('config:load')
    ipcMain.handle('config:load', () => ({ version: 2, profileName: 'Default', unknownTagAction: 'strip', rules: {} }))
  })
  await alert.getByRole('button', { name: 'Try again' }).click()
  await expect(screenTitle(window)).toHaveText('Welcome to FormaFlow')
  await expect(window.locator('aside')).toContainText('Default Profile')
})

test('reloading a document screen goes back to Home with the workflow locked (route guards)', async () => {
  const { window } = run
  await openWorkbook(run, SAMPLE)
  await window.getByRole('button', { name: 'Continue →' }).click()
  await expect(window).toHaveURL(/#\/preview\/Products$/)
  await window.reload()
  await expect(screenTitle(window)).toHaveText('Welcome to FormaFlow')
  await expect(window).toHaveURL(/#\/$/)
  await expect(workspaceNav(window)).not.toContainText('Active')
})
