import { memo } from 'react'
import { columnName, type ConvertOptions } from '@hf/core'
import { RichText, useConversion, type PreviewProps } from '@hf/ui'
import type { SheetPreview } from '@hf/adapter-excel/format'

/**
 * The Excel preview: an Excel-style grid of the top-left part of a sheet.
 * Memoised: progress updates re-render the screen several times a second, but the grid only changes with its data.
 */
export const SheetGrid = memo(function SheetGrid({ preview: data, view, options }: PreviewProps) {
  const preview = data as SheetPreview
  const cols = preview.rows.reduce((max, row) => Math.max(max, row.length), 0)
  if (preview.rows.length === 0) return <div className="placeholder">This sheet is empty.</div>
  return (
    <>
      <div className="grid-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th className="hdr" />
              {Array.from({ length: cols }, (_, c) => (
                <th key={c} className="hdr">
                  {columnName(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, r) => (
              <tr key={r} className="static">
                <td className="hdr">{r + 1}</td>
                {Array.from({ length: cols }, (_, c) => {
                  const cell = row[c]
                  if (!cell) return <td key={c} />
                  if (!cell.html)
                    return (
                      <td key={c} className="xl">
                        {cell.text}
                      </td>
                    )
                  return view === 'formatted' ? (
                    <FormattedCell key={c} html={cell.text} options={options} />
                  ) : (
                    <td key={c} className="code html">
                      {cell.text}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {preview.truncated && (
        <p className="faint text-sm mt-3">
          Showing the first {preview.rows.length} rows and {cols} columns of {preview.rowCount.toLocaleString()} ×{' '}
          {preview.columnCount.toLocaleString()}. The whole sheet is converted when you save.
        </p>
      )}
    </>
  )
})

/** A converted cell, with the cell-level effects Excel will show (the yellow fill of a fully marked cell). */
function FormattedCell({ html, options }: { html: string; options: ConvertOptions }) {
  const result = useConversion(html, options)
  return (
    <td
      className={`xl html${result.fullyHighlighted ? ' filled' : ''}`}
      title={result.fullyHighlighted ? 'The whole cell is highlighted' : undefined}
    >
      <RichText html={html} options={options} result={result} />
    </td>
  )
}
