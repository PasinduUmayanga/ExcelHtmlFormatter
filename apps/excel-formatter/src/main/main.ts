// FormaFlow (Excel): main process. All behaviour comes from @hf/desktop; this file only wires
// in the Excel format, its worker thread, the app icon and the settings folder.
import { join } from 'node:path'
import { app } from 'electron'
import { startDesktopApp } from '@hf/desktop/main'
import { excelFormat } from '@hf/adapter-excel/format'
// electron-vite bundles worker.ts as a separate file and returns a function that starts it.
import createWorker from './worker?nodeWorker'
// Copied next to the built main.js by electron-vite, so it is also inside the packaged app.
import iconPath from '../../build/icon.png?asset'

startDesktopApp({
  format: excelFormat,
  createWorker,
  icon: iconPath,
  // "Load sample": packaged next to the app (electron-builder extraResources), or the repository copy in development.
  samplePath: app.isPackaged
    ? join(process.resourcesPath, 'samples', 'product_catalog.xlsx')
    : join(__dirname, '../../../../packages/adapter-excel/samples/product_catalog.xlsx'),
  // The app was called "Excel HTML Formatter" before FormaFlow: keep using that settings folder,
  // so saved tag styles carry over (ADR 0012).
  userDataFolder: 'Excel HTML Formatter'
})
