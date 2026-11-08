// Writes samples/large_catalog.xlsx for performance testing. Run: npm run sample:large [rows]
// Each row has 4 HTML cells, so the default 15,000 rows = 60,000 HTML cells in the first sheet.
import { mkdirSync } from 'node:fs'
import ExcelJS from 'exceljs'

const rows = Number(process.argv[2] ?? 15000)
const target = 'samples/large_catalog.xlsx'
mkdirSync('samples', { recursive: true })

const wb = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: target, useSharedStrings: true })
const sheet = wb.addWorksheet('Products')
sheet.addRow(['SKU', 'Product', 'Description', 'Notes', 'Formula', 'Price']).commit()
for (let i = 1; i <= rows; i++) {
  sheet
    .addRow([
      `SKU-${String(i).padStart(6, '0')}`,
      `<b>Product ${i}</b>`,
      `A <i>fine</i> item with <u>number ${i}</u> and H<sub>2</sub>O`,
      `<b><i>Note</i></b> line one<br>line <s>two</s> &amp; more`,
      `x${i}<sup>2</sup>`,
      (i * 37) % 5000
    ])
    .commit()
}
sheet.commit()
const small = wb.addWorksheet('Summary')
small.addRow(['Rows', rows]).commit()
small.commit()
await wb.commit()
console.log(`Wrote ${target}: ${rows.toLocaleString()} rows, ${(rows * 4).toLocaleString()} HTML cells`)
