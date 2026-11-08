import ExcelJS from 'exceljs'

/**
 * Builds the sample workbook used by the tests and by `npm run sample`.
 * It deliberately includes tricky cells: rich text, formulas, links, merged cells,
 * numbers, a hidden sheet and a sheet with no HTML.
 */
export function buildSampleWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()

  const products = wb.addWorksheet('Products')
  products.addRows([
    ['SKU', 'Product', 'Description', 'Price'],
    ['TEA-001', '<b>Ceylon Black</b>', 'Strong <i>high-grown</i> tea from <b>Nuwara Eliya</b>', 1200],
    ['TEA-002', '<b>Green Jasmine</b>', 'Light and <i>floral</i>.<br>Best served <u>without milk</u>', 1450],
    ['TEA-003', '<b>Earl Grey</b>', 'Black tea with <i>bergamot</i> oil', 1350],
    ['TEA-004', '<b>White Silver Tips</b>', '<b><i>Rare</i></b> hand-rolled buds, <mark>limited stock</mark>', 4800],
    ['TEA-005', '<b>Masala Chai</b>', 'Spiced blend: <i>cardamom</i>, <i>ginger</i>, <i>clove</i>', 1100]
  ])
  // A formula whose result looks like HTML: must NOT be scanned or converted.
  products.getCell('E2').value = { formula: '"<b>"&B2&"</b>"', result: '<b>formula</b>' }
  // A hyperlink: must NOT be scanned or converted.
  products.getCell('F2').value = { text: '<i>link</i>', hyperlink: 'https://example.com' }

  const team = wb.addWorksheet('Team')
  team.addRows([
    ['Name', 'Role', 'Note'],
    ['<b>my name</b> is <i>pasindu</i>', '<u>Developer</u>', 'Owns the <b>converter</b> module'],
    ['<b>Nimal</b>', '<u>Designer</u>', 'Works on <i>UI</i> screens'],
    ['<b>Ayesha</b>', '<u>QA</u>', 'Tests the <s>old</s> <b>new</b> build']
  ])
  // Existing rich text is read as its plain text.
  team.getCell('A6').value = { richText: [{ text: 'Already ' }, { text: '<sup>rich</sup>', font: { bold: true } }] }
  // A merged range: only the top-left cell counts.
  team.getCell('A8').value = '<em>merged</em> title'
  team.mergeCells('A8:C8')

  const science = wb.addWorksheet('Science')
  science.addRows([
    ['Item', 'Formula', 'Note'],
    ['Water', 'H<sub>2</sub>O', '<i>Essential</i> for life'],
    ['Circle area', 'π r<sup>2</sup>', 'Use <strong>metres</strong>'],
    ['Energy', 'E = mc<sup>2</sup>', '<span style="color:red">Important</span> constant']
  ])

  const summary = wb.addWorksheet('Summary')
  summary.addRows([
    ['Metric', 'Value'],
    ['Total products', 5],
    ['Last updated', new Date(Date.UTC(2026, 10, 8))],
    ['Rule', 'x < 5 is not a tag']
  ])

  const hidden = wb.addWorksheet('Lookup', { state: 'hidden' })
  hidden.addRows([
    ['Code', 'Label'],
    ['A', '<b>Active</b>']
  ])

  return wb
}
