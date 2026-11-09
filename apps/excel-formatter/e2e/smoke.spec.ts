// End-to-end smoke tests: the real built app, driven like a user.
// Run with `pnpm test:e2e` from the repo root (builds the app first).
import { test, expect } from '@playwright/test'
import ExcelJS from 'exceljs'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { answerSaveDialog, launchApp, openWorkbook, SAMPLE, screenTitle, type RunningApp } from './fixtures'

let run: RunningApp
test.beforeEach(async () => {
  run = await launchApp()
})
test.afterEach(async () => {
  await run.app.close()
})

const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')

test('starts on Open with the document steps locked', async () => {
  const { window } = run
  await expect(screenTitle(window)).toHaveText('Open an Excel file')
  await expect(window).toHaveURL(/#\/open$/)
  for (const step of ['Select sheets', 'Tag analysis', 'Preview & export']) {
    await expect(window.locator('.nav', { hasText: step })).toHaveAttribute('aria-disabled', 'true')
  }
})

test('open → analyse → set a style → preview → export a formatted copy', async () => {
  const { app, window, dir } = run
  const before = hash(SAMPLE)

  await openWorkbook(run, SAMPLE)
  await expect(window.locator('.sub')).toContainText('6 sheets found in product_catalog.xlsx')
  await expect(window.locator('.sub')).toContainText('4 contain HTML and are selected for you')

  await window.getByRole('button', { name: 'Analyse tags →' }).click()
  await expect(window).toHaveURL(/#\/analysis\/Products$/)
  await window.getByRole('tab', { name: /Science/ }).click()
  await expect(window).toHaveURL(/#\/analysis\/Science$/)
  // <span> has no rule but a built-in look: it is not reported as missing.
  await expect(window.locator('tr', { hasText: '<span>' })).toContainText('Default')
  await expect(window.locator('.stat').last()).toContainText('0')

  // Change the look of <mark> (italic on top of its default) and come back.
  await window.getByRole('tab', { name: /Formatting/ }).click()
  await window.locator('tr', { hasText: '<mark>' }).getByRole('button', { name: 'Edit' }).click()
  await expect(window).toHaveURL(/#\/settings\?tag=mark&back=%2Fanalysis%2FFormatting$/)
  await window.locator('button[title="Italic"]').click()
  await window.getByRole('button', { name: /Done, back to tag analysis/ }).click()
  await expect(window).toHaveURL(/#\/analysis\/Formatting$/)

  await window.getByRole('button', { name: 'Preview result →' }).click()
  await expect(window).toHaveURL(/#\/preview\/Formatting$/)
  // The content check runs by itself: nothing lost, 2 notes (the unsafe and the extra link).
  await expect(window.locator('.check-chip')).toContainText('all 41 cells complete', { timeout: 30_000 })
  await expect(window.locator('.check-chip')).toContainText('2 notes')
  await expect(window.locator('td.filled')).toHaveText('Sold out')
  await window.getByRole('radio', { name: 'Original HTML' }).click()
  await expect(window).toHaveURL(/view=original/)
  await expect(window.locator('.grid')).toContainText('<mark>Sold out</mark>')

  const target = join(dir, 'formatted.xlsx')
  await answerSaveDialog(app, target)
  await window.getByRole('button', { name: /Save formatted file/ }).click()
  const success = window.locator('.success')
  await expect(success).toContainText('41 cells formatted in 4 sheets, 9 set to wrap text', { timeout: 30_000 })
  await expect(success).toContainText('2 links added, 2 links not added')
  await expect(success).toContainText('1 cell highlighted')
  await expect(success).toContainText('Verified: the saved file matches')

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
  await window.getByRole('button', { name: 'Analyse tags →' }).click()
  await window.getByRole('button', { name: 'Preview result →' }).click()
  await expect(window.locator('.check-chip')).toContainText('1 cell needs review', { timeout: 30_000 })

  // Save stops at the compare screen; nothing is written.
  const target = join(dir, 'long-formatted.xlsx')
  await answerSaveDialog(app, target)
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
  await expect(window).toHaveURL(/#\/preview\/Long$/)
  await expect(window.locator('.success')).toContainText('Saved with 1 known issue', { timeout: 30_000 })
  await expect(window.locator('.success')).toContainText('Verified: the saved file matches')
  expect(existsSync(target)).toBe(true)
})

test('refuses to overwrite the original file', async () => {
  const { app, window } = run
  const before = hash(SAMPLE)
  await openWorkbook(run, SAMPLE)
  await window.getByRole('button', { name: 'Analyse tags →' }).click()
  await window.getByRole('button', { name: 'Preview result →' }).click()
  await answerSaveDialog(app, SAMPLE.toUpperCase())
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
  await window.getByRole('button', { name: 'Analyse tags →' }).click()
  await window.getByRole('button', { name: 'Preview result →' }).click()
  const outDir = join(dir, 'out')
  await answerSaveDialog(app, join(outDir, 'cancelled.xlsx'))
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
  await window.getByRole('button', { name: 'Analyse tags →' }).click()
  await window.getByRole('button', { name: 'Preview result →' }).click()
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
  await window.getByRole('button', { name: /Save formatted file/ }).click()

  await expect(window.locator('.success')).toContainText('Saved verified.xlsx', { timeout: 30_000 })
  await expect(window.locator('.success')).toContainText('The saved file was not checked (stopped).')
  expect(existsSync(target)).toBe(true)
})

test('reloading a document screen goes back to Open (route guards)', async () => {
  const { window } = run
  await openWorkbook(run, SAMPLE)
  await window.getByRole('button', { name: 'Analyse tags →' }).click()
  await window.getByRole('button', { name: 'Preview result →' }).click()
  await expect(window).toHaveURL(/#\/preview\/Products$/)
  await window.reload()
  await expect(screenTitle(window)).toHaveText('Open an Excel file')
  await expect(window).toHaveURL(/#\/open$/)
})
