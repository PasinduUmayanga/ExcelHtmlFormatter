// Writes samples/product_catalog.xlsx for trying the app by hand. Run: npm run sample
import { mkdirSync } from 'node:fs'
import { buildSampleWorkbook } from './sampleWorkbook.mts'

mkdirSync('samples', { recursive: true })
await buildSampleWorkbook().xlsx.writeFile('samples/product_catalog.xlsx')
console.log('Wrote samples/product_catalog.xlsx')
