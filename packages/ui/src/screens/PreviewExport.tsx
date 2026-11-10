import { useEffect, useMemo } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { capitalize, defaultConfig, isConfigured, mergeScans } from '@hf/core'
import { useApp } from '../state/store'
import { useFormatterApp } from '../router'
import { Button } from '../design/atoms'
import { SegmentedControl, Stat } from '../design/molecules'
import { MissingStylesBanner, ProcessingPanel, SectionTabs, VerificationPanel } from '../design/organisms'
import { WorkflowTemplate } from '../design/templates'

const fallbackConfig = defaultConfig()
const route = getRouteApi('/preview/$section')
const VIEWS = [
  ['side', 'Side by side'],
  ['formatted', 'Formatted'],
  ['original', 'Original HTML']
] as const

export function PreviewExport() {
  const { format, Preview } = useFormatterApp()
  const { section } = route.useParams()
  const { view } = route.useSearch()
  const navigate = useNavigate()
  const { doc, selected: selectedNames, config, previews, loadPreview, runCheck } = useApp()

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
  const setView = (next?: 'original' | 'formatted') =>
    navigate({ to: '/preview/$section', params: { section }, search: next ? { view: next } : {}, replace: true })

  return (
    <WorkflowTemplate
      step="preview"
      title="Processing & preview"
      intro={
        <>
          Compare the original {unit.plural} with the result and check the content before you save. Each HTML{' '}
          {unit.singular} keeps its text and gets real formatting.
        </>
      }
      footer={
        <>
          <Button onClick={() => navigate({ to: '/configure', search: { tab: 'tags', section } })}>← Back</Button>
          <Button variant="primary" disabled={selected.length === 0} onClick={() => navigate({ to: '/complete' })}>
            Continue →
          </Button>
        </>
      }
    >
      <ProcessingPanel items={unit.plural} />

      <div className="stats">
        <Stat
          value={selected.length}
          label={`${capitalize(selected.length === 1 ? format.section.singular : format.section.plural)} to convert`}
        />
        <Stat value={merged.htmlCells} label={`${capitalize(unit.plural)} to format`} />
        <Stat value={missing.length} label="Tags with no style" tone={missing.length ? 'warn' : 'ok'} />
      </div>

      <VerificationPanel section={section} onRetry={runCheck} />

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
          value={view ?? 'side'}
          options={VIEWS}
          onChange={(next) => setView(next === 'side' ? undefined : next)}
        />
      </div>

      {!preview ? (
        <div className="placeholder">Loading {section}…</div>
      ) : view ? (
        <Preview preview={preview} view={view} options={options} />
      ) : (
        <div className="compare">
          <section aria-label="Original">
            <h3 className="compare-head">Original (HTML in {unit.plural})</h3>
            <Preview preview={preview} view="original" options={options} />
          </section>
          <section aria-label="Formatted">
            <h3 className="compare-head">Formatted (preview)</h3>
            <Preview preview={preview} view="formatted" options={options} />
          </section>
        </div>
      )}
    </WorkflowTemplate>
  )
}
