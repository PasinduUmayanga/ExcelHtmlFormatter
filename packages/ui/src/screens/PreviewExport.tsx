import { useEffect, useMemo } from 'react'
import type { ExportResult } from '@hf/core'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { capitalize, count, defaultConfig, isConfigured, mergeScans } from '@hf/core'
import { useApp } from '../store'
import { useFormatterApp } from '../router'
import { useEditTag } from '../hooks'
import { SectionTabs } from '../components/SectionTabs'
import { JobProgressPanel } from '../components/JobProgress'
import { Stat } from '../components/Stat'
import { CheckChip } from '../components/CheckChip'

const fallbackConfig = defaultConfig()
const route = getRouteApi('/preview/$section')

export function PreviewExport() {
  const { format, Preview } = useFormatterApp()
  const { section } = route.useParams()
  const { view } = route.useSearch()
  const navigate = useNavigate()
  const editTag = useEditTag()
  const {
    doc,
    selected: selectedNames,
    config,
    previews,
    loadPreview,
    exporting,
    exportResult,
    exportDocument,
    showInFolder,
    dismissExportResult,
    check,
    runCheck
  } = useApp()

  useEffect(() => {
    loadPreview(section)
  }, [section, loadPreview])

  // Check the content whenever the file, selection or settings change (waits briefly while styles are edited).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!useApp.getState().isCheckCurrent()) void runCheck()
    }, 300)
    return () => clearTimeout(timer)
  }, [doc, selectedNames, config, runCheck])

  const save = async () => {
    const outcome = await exportDocument()
    if (outcome === 'review') {
      const first = useApp.getState().check.report?.items.find((i) => i.severity === 'issue')
      navigate({
        to: '/check/$section',
        params: { section: first?.section ?? section },
        search: { cell: first?.location, saved: undefined }
      })
    }
  }

  const selected = useMemo(
    () => (doc ? doc.sections.filter((s) => selectedNames.includes(s.name)) : []),
    [doc, selectedNames]
  )
  const merged = useMemo(() => mergeScans(selected.map((s) => s.scan)), [selected])

  if (!doc) return null
  const { unit } = format
  const options = config ?? fallbackConfig
  const missing = Object.keys(merged.tags)
    .filter((t) => !isConfigured(t, options.rules))
    .sort()
  const preview = previews[section]
  const setView = (next?: 'original') =>
    navigate({ to: '/preview/$section', params: { section }, search: next ? { view: next } : {}, replace: true })

  return (
    <>
      <h1>Preview &amp; export</h1>
      <p className="sub">
        How the {unit.plural} will look after formatting. Each HTML {unit.singular} keeps its text and gets real
        formatting.
      </p>

      <JobProgressPanel title="Saving the formatted file" items={unit.plural} />

      {exportResult && <SaveSummary result={exportResult} onShow={showInFolder} onDismiss={dismissExportResult} />}

      <div className="stats">
        <Stat
          value={selected.length}
          label={`${capitalize(selected.length === 1 ? format.section.singular : format.section.plural)} to convert`}
        />
        <Stat value={merged.htmlCells} label={`${capitalize(unit.plural)} to format`} />
        <Stat value={missing.length} label="Tags with no style" tone={missing.length ? 'warn' : 'ok'} />
      </div>

      <CheckChip section={section} onRetry={runCheck} />

      {missing.length > 0 && (
        <div className="banner" role="status">
          <span>
            ⚠ No style set for {missing.map((t) => `<${t}>`).join(', ')}.{' '}
            {options.unknownTagAction === 'keep'
              ? `They will stay in the ${unit.plural} as visible text.`
              : 'They will be removed and their text left plain.'}
          </span>
          <button className="btn link" onClick={() => editTag(missing[0])}>
            Set a style →
          </button>
        </div>
      )}

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <SectionTabs screen="preview" current={section} view={view} />
        <div className="seg" role="radiogroup" aria-label="Preview mode" style={{ marginBottom: 16 }}>
          <button role="radio" aria-checked={!view} className={!view ? 'on' : ''} onClick={() => setView()}>
            Formatted
          </button>
          <button
            role="radio"
            aria-checked={view === 'original'}
            className={view === 'original' ? 'on' : ''}
            onClick={() => setView('original')}
          >
            Original HTML
          </button>
        </div>
      </div>

      {preview ? (
        <Preview preview={preview} view={view ?? 'formatted'} options={options} />
      ) : (
        <div className="placeholder">Loading {section}…</div>
      )}

      <div className="footer">
        <button className="btn" onClick={() => navigate({ to: '/analysis/$section', params: { section } })}>
          ← Back
        </button>
        <div className="row">
          <span className="faint" style={{ fontSize: 12.5, maxWidth: 360 }}>
            {format.text.saveNote}
          </span>
          <button className="btn primary" onClick={save} disabled={exporting || selected.length === 0}>
            {exporting ? (check.status === 'running' ? 'Checking…' : 'Saving…') : '💾 Save formatted file…'}
          </button>
        </div>
      </div>
    </>
  )
}

/** The success box after saving: what was done, any known issues, and whether the saved file checked out. */
function SaveSummary({
  result,
  onShow,
  onDismiss
}: {
  result: ExportResult
  onShow: () => void
  onDismiss: () => void
}) {
  const { format } = useFormatterApp()
  const { config } = useApp()
  const navigate = useNavigate()
  const { stats, verification } = result
  const { unit } = format
  const action = (config ?? fallbackConfig).unknownTagAction === 'keep' ? 'kept as text' : 'removed'
  const review = (saved: boolean) => {
    const first = saved ? verification?.items[0] : stats.check.items[0]
    navigate({
      to: '/check/$section',
      params: { section: first?.section || stats.sections[0]?.name || '' },
      search: { cell: first?.location || undefined, saved: saved ? true : undefined }
    })
  }
  const details = [
    `${count(stats.converted, unit)} formatted in ${count(stats.sections.length, format.section)}`,
    stats.withLineBreaks > 0 && `${stats.withLineBreaks.toLocaleString()} ${format.text.lineBreakNote}`,
    stats.linksAdded > 0 && `${count(stats.linksAdded, { singular: 'link', plural: 'links' })} added`,
    stats.linksSkipped > 0 &&
      `${count(stats.linksSkipped, { singular: 'link', plural: 'links' })} not added (unsafe, or more than one in a ${unit.singular})`,
    stats.highlighted > 0 && `${count(stats.highlighted, unit)} highlighted`
  ].filter(Boolean)

  return (
    <div className="success" role="status">
      <div>
        <b>✓ Saved {result.fileName}</b>
        <div className="success-detail">
          {details.join(', ')}.
          {stats.unknownTags.length > 0 &&
            ` Tags with no style (${stats.unknownTags.map((t) => `<${t}>`).join(', ')}) were ${action}.`}{' '}
          Your original file was not changed.
        </div>
        <div className="success-detail">
          {stats.check.issues > 0 && (
            <button className="btn link" onClick={() => review(false)}>
              ⚠ Saved with {count(stats.check.issues, { singular: 'known issue', plural: 'known issues' })} →
            </button>
          )}{' '}
          {verification === null ? (
            <span className="faint">The saved file was not checked (stopped).</span>
          ) : verification.differences === 0 ? (
            <span>✓ Verified: the saved file matches ({count(verification.compared, unit)} compared).</span>
          ) : (
            <button className="btn link" onClick={() => review(true)}>
              ⚠ The saved file has {count(verification.differences, { singular: 'difference', plural: 'differences' })}.
              Review →
            </button>
          )}
        </div>
      </div>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <button className="btn small" onClick={onShow}>
          Show in folder
        </button>
        <button className="btn small" onClick={onDismiss} aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  )
}
