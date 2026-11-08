// Renders build/icon.svg to build/icon.png (1024×1024) using Electron itself. Run: npm run icon
// electron-builder turns icon.png into the Windows .ico and the macOS .icns.
// The SVG is drawn onto a canvas, so the result does not depend on the screen size.
const { app, BrowserWindow } = require('electron')
const { readFileSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

const SIZE = 1024
const svgPath = join(__dirname, '..', 'build', 'icon.svg')
const pngPath = join(__dirname, '..', 'build', 'icon.png')

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
  await win.loadURL('data:text/html,<html><body></body></html>')
  const svg = readFileSync(svgPath, 'utf8')
  const dataUrl = await win.webContents.executeJavaScript(`
    new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = ${SIZE}
        canvas.getContext('2d').drawImage(img, 0, 0, ${SIZE}, ${SIZE})
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => reject(new Error('Could not load the SVG'))
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(${JSON.stringify(svg)})
    })`)
  writeFileSync(pngPath, Buffer.from(dataUrl.split(',')[1], 'base64'))
  console.log(`Wrote ${pngPath} (${SIZE}×${SIZE})`)
  app.quit()
})
