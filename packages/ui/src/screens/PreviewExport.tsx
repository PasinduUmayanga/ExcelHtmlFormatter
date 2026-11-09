import { useEffect, useMemo } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { capitalize, defaultConfig, isConfigured, mergeScans } from '@hf/core'
import { useApp } from '../store'
import { useFormatterApp } from '../router'
import { Button, Icon } from '../design/atoms'
import { SegmentedControl, Stat } from '../design/molecules'
import { CheckChip, JobProgressPanel, MissingStylesBanner, SaveSummary, SectionTabs } from '../design/organisms'
import { ScreenTemplate } from '../design/templates'

const fallbackConfig = defaultConfig()
const route = getRouteApi('/preview/$section')
const VIEWS = [
  ['formatted', 'Formatted'],
  ['original', 'Original HTML']
] as const

export function PreviewExport() {
  const { format, Preview } = useFormatterApp()
  const { section } = route.useParams()
  const { view } = route.useSearch()
  const navigate = useNavigate()
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
    // A clean save ends the workflow: Home shows what was saved.
    if (outcome === 'completed') navigate({ to: '/' })
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
    <ScreenTemplate
      title={'Preview & export'}
      intro={
        <>
          How the {unit.plural} will look after formatting. Each HTML {unit.singular} keeps its text and gets real
          formatting.
        </>
      }
      footer={
        <>
          <Button onClick={() => navigate({ to: '/analysis/$section', params: { section } })}>← Back</Button>
          <div className="row">
            <span className="faint text-sm save-note">{format.text.saveNote}</span>
            <Button variant="primary" onClick={save} disabled={exporting || selected.length === 0}>
              {exporting ? check.status === 'running' ? 'Checking…' : 'Saving…' : <SaveLabel />}
            </Button>
          </div>
        </>
      }
    >
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
        <MissingStylesBanner firstTag={missing[0]}>
          No style set for {missing.map((t) => `<${t}>`).join(', ')}.{' '}
          {options.unknownTagAction === 'keep'
            ? `They will stay in the ${unit.plural} as visible text.`
            : 'They will be removed and their text left plain.'}
        </MissingStylesBanner>
      )}

      <div className="row spread items-end">
        <SectionTabs screen="preview" current={section} view={view} />
        <SegmentedControl
          label="Preview mode"
          className="mb-5"
          value={view ?? 'formatted'}
          options={VIEWS}
          onChange={(next) => setView(next === 'original' ? next : undefined)}
        />
      </div>

      {preview ? (
        <Preview preview={preview} view={view ?? 'formatted'} options={options} />
      ) : (
        <div className="placeholder">Loading {section}…</div>
      )}
    </ScreenTemplate>
  )
}

/** The main button's label when idle: the save icon and the action (as before, one text line). */
function SaveLabel() {
  return (
    <>
      <Icon name="save" /> Save formatted file…
    </>
  )
}
