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
  await expect(window.locator('.sub')).toContainText('5 sheets found in product_catalog.xlsx')
  await expect(window.locator('.sub')).toContainText('3 contain HTML and are selected for you')

  await window.getByRole('button', { name: 'Analyse tags →' }).click()
  await expect(window).toHaveURL(/#\/analysis\/Products$/)
  await window.getByRole('tab', { name: /Science/ }).click()
  await expect(window).toHaveURL(/#\/analysis\/Science$/)

  // <span> has no style in Science: give it one ("keep text plain") and come back.
  await window.getByRole('button', { name: 'Set style' }).click()
  await expect(window).toHaveURL(/#\/settings\?tag=span&back=%2Fanalysis%2FScience$/)
  await window.getByRole('button', { name: 'Keep text plain' }).click()
  await window.getByRole('button', { name: /Done, back to tag analysis/ }).click()
  await expect(window).toHaveURL(/#\/analysis\/Science$/)
  await expect(window.locator('.stat').last()).toContainText('0')

  await window.getByRole('button', { name: 'Preview result →' }).click()
  await expect(window).toHaveURL(/#\/preview\/Science$/)
  await window.getByRole('radio', { name: 'Original HTML' }).click()
  await expect(window).toHaveURL(/view=original/)
  await expect(window.locator('.grid')).toContainText('π r<sup>2</sup>')

  const target = join(dir, 'formatted.xlsx')
  await answerSaveDialog(app, target)
  await window.getByRole('button', { name: /Save formatted file/ }).click()
  await expect(window.locator('.success')).toContainText('27 cells formatted in 3 sheets, 1 set to wrap text', {
    timeout: 30_000
  })

  // The saved file has real rich text, and the original is byte-for-byte unchanged.
  const saved = new ExcelJS.Workbook()
  await saved.xlsx.readFile(target)
  expect(saved.getWorksheet('Team')!.getCell('A2').value).toEqual({
    richText: [{ text: 'my name', font: { bold: true } }, { text: ' is ' }, { text: 'pasindu', font: { italic: true } }]
  })
  expect(saved.getWorksheet('Products')!.getCell('C3').alignment?.wrapText).toBe(true)
  expect(hash(SAMPLE)).toBe(before)
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

test('Cancel stops a large export and leaves no file behind', async () => {
  const { app, window, dir } = run
  // 60,000 HTML cells: big enough that saving takes a few seconds.
  const big = join(dir, 'big.xlsx')
  const writer = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: big, useSharedStrings: true })
  const sheet = writer.addWorksheet('Products')
  for (let i = 1; i <= 15_000; i++) {
    sheet.addRow([`<b>P${i}</b>`, `A <i>fine</i> item ${i}`, `<u>x</u><br>y`, `x<sup>2</sup>`]).commit()
  }
  sheet.commit()
  await writer.commit()

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
