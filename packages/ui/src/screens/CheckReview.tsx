import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import {
  capitalize,
  contentDiff,
  count,
  defaultConfig,
  describeCheckItem,
  diffWords,
  htmlToRuns,
  words,
  type CheckItem,
  type ConvertOptions,
  type DiffPart
} from '@hf/core'
import { useApp } from '../store'
import { useFormatterApp } from '../router'
import { RichText } from '../components/RichText'
import { Stat } from '../components/Stat'

const fallbackConfig = defaultConfig()
const route = getRouteApi('/check/$section')
/** Items listed per page (the list stays fast with tens of thousands of issues) */
export const PAGE_SIZE = 100

/**
 * The compare screen: every issue (and note) the content check found, side by side with the
 * original. Before saving, it shows the content proof; with ?saved, the differences found by
 * re-reading the saved file.
 */
export function CheckReview() {
  const { format } = useFormatterApp()
  const { section } = route.useParams()
  const { cell, saved } = route.useSearch()
  const navigate = useNavigate()
  const { doc, config, check, runCheck, isCheckCurrent, exportResult, exportDocument, exporting, exportReport } =
    useApp()
  const [paged, setPaged] = useState<{ anchor: string; page: number } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const options = config ?? fallbackConfig
  const { unit } = format

  // Before saving, the report must match the current settings (they may have been edited meanwhile).
  useEffect(() => {
    if (!saved && !isCheckCurrent()) void runCheck()
  }, [saved, config, isCheckCurrent, runCheck])

  const items: CheckItem[] = useMemo(
    () => (saved ? (exportResult?.verification?.items ?? []) : (check.report?.items ?? [])),
    [saved, exportResult, check.report]
  )
  const sectionNames = useMemo(() => {
    const order = doc?.sections.map((s) => s.name) ?? []
    const present = new Set(items.map((i) => i.section))
    return order.filter((name) => present.has(name) || name === section)
  }, [doc, items, section])
  const here = useMemo(() => items.filter((i) => i.section === section), [items, section])

  const selectedIndex = Math.max(
    0,
    here.findIndex((i) => i.location === cell)
  )
  // The page shows the selected item, unless the user paged away from it (until the selection changes).
  const anchor = `${section}\u0001${selectedIndex}`
  const page = paged?.anchor === anchor ? paged.page : Math.floor(selectedIndex / PAGE_SIZE)
  const setPage = (next: number) => setPaged({ anchor, page: next })
  const selectedItem = here[selectedIndex]
  useFocusSelected(listRef, selectedItem?.location)

  if (!doc) return null
  const pages = Math.max(1, Math.ceil(here.length / PAGE_SIZE))
  const shown = here.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const select = (item: CheckItem | undefined, target = section) =>
    navigate({
      to: '/check/$section',
      params: { section: target },
      search: { cell: item?.location, saved: saved || undefined },
      replace: true
    })

  const onKey = (e: KeyboardEvent) => {
    const moves: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, PageDown: 10, PageUp: -10 }
    let next: number | undefined
    if (e.key in moves) next = selectedIndex + moves[e.key]
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = here.length - 1
    if (next === undefined || here.length === 0) return
    e.preventDefault()
    select(here[Math.min(here.length - 1, Math.max(0, next))])
  }

  const report = saved ? null : check.report
  const verification = saved ? exportResult?.verification : null
  const issues = saved ? (verification?.differences ?? 0) : (report?.issues ?? 0)
  const truncated = saved ? verification?.truncated : report?.truncated

  const saveAnyway = async () => {
    setConfirming(false)
    const outcome = await exportDocument(true)
    if (outcome === 'saved') navigate({ to: '/preview/$section', params: { section } })
  }

  return (
    <>
      <h1>{saved ? 'Saved file check' : 'Content check'}</h1>
      <p className="sub">
        {saved
          ? `The saved file was read back and compared with what was converted. Every other ${unit.singular} must be unchanged.`
          : `Every converted ${unit.singular} is compared with its original text, so nothing is lost without you knowing.`}
      </p>

      {!saved && check.status === 'running' && (
        <div className="check-chip">Checking again with your current tag styles…</div>
      )}
      {!saved && check.status === 'failed' && <div className="check-chip warn">⚠ {check.error}</div>}

      <div className="stats">
        {report && (
          <>
            <Stat value={report.complete} label={`${capitalize(unit.plural)} complete`} tone="ok" />
            <Stat value={report.issues} label="Need review" tone={report.issues ? 'warn' : 'ok'} />
            <Stat value={report.notes} label={report.notes === 1 ? 'Note' : 'Notes'} />
          </>
        )}
        {verification && (
          <>
            <Stat value={verification.compared} label={`${capitalize(unit.plural)} compared`} tone="ok" />
            <Stat
              value={verification.differences}
              label="Differences"
              tone={verification.differences ? 'warn' : 'ok'}
            />
          </>
        )}
      </div>
      {truncated && (
        <p className="faint">
          Only the first {items.length.toLocaleString()} are listed. Export the report for the counts; fix these and
          check again.
        </p>
      )}

      {items
        .filter((i) => !i.section)
        .map((i, n) => (
          <div key={n} className="banner" role="alert">
            ⚠ {i.saved}
          </div>
        ))}

      <div className="tabs" role="tablist" aria-label={format.section.plural}>
        {sectionNames.map((name) => {
          const n = items.filter((i) => i.section === name).length
          return (
            <button
              key={name}
              role="tab"
              aria-selected={name === section}
              className={`tab ${name === section ? 'active' : ''}`}
              onClick={() =>
                select(
                  items.find((i) => i.section === name),
                  name
                )
              }
            >
              {name} <span className="faint">{n}</span>
            </button>
          )
        })}
      </div>

      {here.length === 0 ? (
        <div className="placeholder">
          {check.status === 'running' && !saved
            ? 'Checking…'
            : `Nothing to review in this ${format.section.singular}: every ${unit.singular} is complete.`}
        </div>
      ) : (
        <div className="check-layout">
          <div
            className="check-list"
            role="listbox"
            aria-label="Items to review"
            tabIndex={0}
            ref={listRef}
            onKeyDown={onKey}
            aria-activedescendant={selectedItem ? `check-${selectedItem.location}` : undefined}
          >
            {shown.map((item) => (
              <div
                key={item.location}
                id={`check-${item.location}`}
                role="option"
                aria-selected={item === selectedItem}
                className={`check-row ${item === selectedItem ? 'active' : ''}`}
                onClick={() => select(item)}
              >
                <span className={`chip ${item.severity === 'issue' ? 'warn' : ''}`}>
                  {item.severity === 'issue' ? '⚠' : 'ℹ'} {item.location || '—'}
                </span>
                <span className="check-desc">{describeCheckItem(item)}</span>
              </div>
            ))}
            {pages > 1 && (
              <div className="row pager">
                <button className="btn small" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  ← Previous
                </button>
                <span className="faint">
                  Page {page + 1} of {pages}
                </span>
                <button className="btn small" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
                  Next →
                </button>
              </div>
            )}
          </div>
          {selectedItem && <CheckDetail item={selectedItem} options={options} />}
        </div>
      )}

      {confirming && (
        <div className="banner" role="alertdialog" aria-label="Save anyway">
          <span>
            Save with {count(issues, { singular: 'known issue', plural: 'known issues' })}? The{' '}
            {issues === 1 ? `${unit.singular} keeps its issue` : `${unit.plural} keep their issues`} in the saved file.
            Your original file is not changed.
          </span>
          <div className="row">
            <button className="btn small" onClick={() => setConfirming(false)}>
              Cancel
            </button>
            <button className="btn small primary" onClick={saveAnyway}>
              Save anyway
            </button>
          </div>
        </div>
      )}

      <div className="footer">
        <div className="row">
          <button
            className="btn"
            onClick={() =>
              navigate({
                to: '/preview/$section',
                params: { section: doc.sections.some((s) => s.name === section) ? section : doc.sections[0].name }
              })
            }
          >
            ← Back to preview
          </button>
          <button
            className="btn"
            onClick={() =>
              navigate({
                to: '/settings',
                search: { tag: undefined, back: `/check/${encodeURIComponent(section)}` }
              })
            }
          >
            Edit tag styles
          </button>
        </div>
        <div className="row">
          <button className="btn" disabled={items.length === 0} onClick={() => exportReport(items)}>
            Export report (CSV)
          </button>
          {!saved && issues > 0 && (
            <button
              className="btn primary"
              disabled={exporting || check.status !== 'done'}
              onClick={() => setConfirming(true)}
            >
              Save anyway ({count(issues, { singular: 'issue', plural: 'issues' })})…
            </button>
          )}
        </div>
      </div>
    </>
  )
}

/** Scrolls the selected row into view when it changes (keyboard navigation). */
function useFocusSelected(listRef: RefObject<HTMLDivElement | null>, location: string | undefined) {
  useEffect(() => {
    if (!location) return
    listRef.current?.querySelector(`[id="check-${CSS.escape(location)}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [listRef, location])
}

/** One item side by side: the raw HTML, the original text (missing words in red) and the result. */
export function CheckDetail({ item, options }: { item: CheckItem; options: ConvertOptions }) {
  const result = useMemo(() => htmlToRuns(item.source, options), [item.source, options])
  const isAfterSave = item.kind === 'saved' || item.kind === 'untouched'
  const parts = useMemo(
    () =>
      isAfterSave
        ? diffWords(words(item.converted), words(item.saved ?? ''))
        : contentDiff(item.source, result, options),
    [isAfterSave, item, result, options]
  )

  return (
    <div className="check-detail" aria-label={`Details of ${item.location}`}>
      <div className="check-desc-full">
        <b>{item.location || 'File'}</b> · {describeCheckItem(item)}
      </div>
      {item.kind !== 'untouched' && (
        <section>
          <h3>Original HTML</h3>
          <pre className="code check-text">{clip(item.source)}</pre>
        </section>
      )}
      {isAfterSave ? (
        <>
          <section>
            <h3>{item.kind === 'untouched' ? 'Original value' : 'Converted text'}</h3>
            <DiffText parts={parts} side="before" fallback={item.converted} />
          </section>
          <section>
            <h3>In the saved file</h3>
            <DiffText parts={parts} side="after" fallback={item.saved ?? ''} />
          </section>
        </>
      ) : (
        <>
          <section>
            <h3>Original text</h3>
            <DiffText parts={parts} side="before" fallback={item.converted} />
          </section>
          <section>
            <h3>Converted</h3>
            <div className="check-text">
              <RichText html={item.source} options={options} result={result} />
            </div>
            <p className="faint legend">
              <span className="layout-sample">Green</span>: bullets, numbers and separators added for layout.{' '}
              <del>Red</del>: text missing from the result. <ins>Underlined</ins>: text not in the original.
            </p>
            {(item.proof?.added.length ?? 0) > 0 && (
              <p>
                Not in the original:{' '}
                {item.proof!.added.map((g, i) => (
                  <ins key={i}>{g.text} </ins>
                ))}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}

/** Words of one side of a diff, with the other side's differences marked (as text, never as HTML). */
function DiffText({ parts, side, fallback }: { parts: DiffPart[] | null; side: 'before' | 'after'; fallback: string }) {
  if (!parts) return <div className="check-text">{fallback}</div>
  return (
    <div className="check-text">
      {parts.map((part, i) => {
        const text = part.items.join(' ') + ' '
        if (part.op === 'same') return <span key={i}>{text}</span>
        if (part.op === 'removed') return side === 'before' ? <del key={i}>{text}</del> : null
        return side === 'after' ? <ins key={i}>{text}</ins> : null
      })}
    </div>
  )
}

/** Raw HTML shown in the detail panel: the start of very long cells only (the full text is in the CSV report). */
export const MAX_SHOWN_HTML = 5000
export function clip(text: string): string {
  if (text.length <= MAX_SHOWN_HTML) return text
  return `${text.slice(0, MAX_SHOWN_HTML)}… (${(text.length - MAX_SHOWN_HTML).toLocaleString('en-US')} more characters)`
}
