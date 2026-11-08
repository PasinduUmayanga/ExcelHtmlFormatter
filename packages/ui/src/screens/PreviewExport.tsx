import { useEffect, useMemo } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { capitalize, count, defaultConfig, isConfigured, mergeScans } from '@hf/core'
import { useApp } from '../store'
import { useFormatterApp } from '../router'
import { useEditTag } from '../hooks'
import { SectionTabs } from '../components/SectionTabs'
import { JobProgressPanel } from '../components/JobProgress'
import { Stat } from '../components/Stat'

const fallbackConfig = defaultConfig()
const route = getRouteApi('/preview/$section')

export function PreviewExport() {
  const { format, Preview } = useFormatterApp()
  const { section } = route.useParams()
  const { view } = route.useSearch()
  const navigate = useNavigate()
  const editTag = useEditTag()
  const {
    doc, selected: selectedNames, config, previews, loadPreview,
    exporting, exportResult, exportDocument, showInFolder, dismissExportResult
  } = useApp()

  useEffect(() => {
    loadPreview(section)
  }, [section, loadPreview])

  const selected = useMemo(() => (doc ? doc.sections.filter((s) => selectedNames.includes(s.name)) : []), [doc, selectedNames])
  const merged = useMemo(() => mergeScans(selected.map((s) => s.scan)), [selected])

  if (!doc) return null
  const { unit } = format
  const options = config ?? fallbackConfig
  const missing = Object.keys(merged.tags).filter((t) => !isConfigured(t, options.rules)).sort()
  const preview = previews[section]
  const setView = (next?: 'original') => navigate({ to: '/preview/$section', params: { section }, search: next ? { view: next } : {}, replace: true })

  return (
    <>
      <h1>Preview &amp; export</h1>
      <p className="sub">How the {unit.plural} will look after formatting. Each HTML {unit.singular} keeps its text and gets real formatting.</p>

      <JobProgressPanel title="Saving the formatted file" items={unit.plural} />

      {exportResult && (
        <div className="success" role="status">
          <div>
            <b>✓ Saved {exportResult.fileName}</b>
            <div className="success-detail">
              {count(exportResult.stats.converted, unit)} formatted in {count(exportResult.stats.sections.length, format.section)}
              {exportResult.stats.withLineBreaks > 0 && `, ${exportResult.stats.withLineBreaks.toLocaleString()} ${format.text.lineBreakNote}`}.
              {exportResult.stats.unknownTags.length > 0 &&
                ` Tags with no style (${exportResult.stats.unknownTags.map((t) => `<${t}>`).join(', ')}) were ${options.unknownTagAction === 'keep' ? 'kept as text' : 'removed'}.`}
              {' '}Your original file was not changed.
            </div>
          </div>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <button className="btn small" onClick={showInFolder}>Show in folder</button>
            <button className="btn small" onClick={dismissExportResult} aria-label="Dismiss">✕</button>
          </div>
        </div>
      )}

      <div className="stats">
        <Stat value={selected.length} label={`${capitalize(selected.length === 1 ? format.section.singular : format.section.plural)} to convert`} />
        <Stat value={merged.htmlCells} label={`${capitalize(unit.plural)} to format`} />
        <Stat value={missing.length} label="Tags with no style" tone={missing.length ? 'warn' : 'ok'} />
      </div>

      {missing.length > 0 && (
        <div className="banner" role="status">
          <span>
            ⚠ No style set for {missing.map((t) => `<${t}>`).join(', ')}.{' '}
            {options.unknownTagAction === 'keep' ? `They will stay in the ${unit.plural} as visible text.` : 'They will be removed and their text left plain.'}
          </span>
          <button className="btn link" onClick={() => editTag(missing[0])}>Set a style →</button>
        </div>
      )}

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <SectionTabs screen="preview" current={section} view={view} />
        <div className="seg" role="radiogroup" aria-label="Preview mode" style={{ marginBottom: 16 }}>
          <button role="radio" aria-checked={!view} className={!view ? 'on' : ''} onClick={() => setView()}>Formatted</button>
          <button role="radio" aria-checked={view === 'original'} className={view === 'original' ? 'on' : ''} onClick={() => setView('original')}>Original HTML</button>
        </div>
      </div>

      {preview ? (
        <Preview preview={preview} view={view ?? 'formatted'} options={options} />
      ) : (
        <div className="placeholder">Loading {section}…</div>
      )}

      <div className="footer">
        <button className="btn" onClick={() => navigate({ to: '/analysis/$section', params: { section } })}>← Back</button>
        <div className="row">
          <span className="faint" style={{ fontSize: 12.5, maxWidth: 360 }}>{format.text.saveNote}</span>
          <button className="btn primary" onClick={exportDocument} disabled={exporting || selected.length === 0}>
            {exporting ? 'Saving…' : '💾 Save formatted file…'}
          </button>
        </div>
      </div>
    </>
  )
}
