import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { capitalize, count, defaultConfig, type CheckItem } from '@hf/core'
import { useApp } from '../store'
import { useFormatterApp } from '../router'
import { Button, Icon } from '../design/atoms'
import { Banner, ConfirmBox, Stat, Tab, Tabs } from '../design/molecules'
import { CheckDetail, CheckList } from '../design/organisms'
import { ScreenTemplate } from '../design/templates'

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
    <ScreenTemplate
      title={saved ? 'Saved file check' : 'Content check'}
      intro={
        <>
          {saved
            ? `The saved file was read back and compared with what was converted. Every other ${unit.singular} must be unchanged.`
            : `Every converted ${unit.singular} is compared with its original text, so nothing is lost without you knowing.`}
        </>
      }
      footer={
        <>
          <div className="row">
            <Button
              onClick={() =>
                navigate({
                  to: '/preview/$section',
                  params: { section: doc.sections.some((s) => s.name === section) ? section : doc.sections[0].name }
                })
              }
            >
              ← Back to preview
            </Button>
            <Button
              onClick={() =>
                navigate({
                  to: '/settings',
                  search: { tag: undefined, back: `/check/${encodeURIComponent(section)}` }
                })
              }
            >
              Edit tag styles
            </Button>
          </div>
          <div className="row">
            <Button disabled={items.length === 0} onClick={() => exportReport(items)}>
              Export report (CSV)
            </Button>
            {!saved && issues > 0 && (
              <Button
                variant="primary"
                disabled={exporting || check.status !== 'done'}
                onClick={() => setConfirming(true)}
              >
                Save anyway ({count(issues, { singular: 'issue', plural: 'issues' })})…
              </Button>
            )}
          </div>
        </>
      }
    >
      {!saved && check.status === 'running' && (
        <div className="check-chip">Checking again with your current tag styles…</div>
      )}
      {!saved && check.status === 'failed' && (
        <div className="check-chip warn">
          <Icon name="warning" /> {check.error}
        </div>
      )}

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
          <Banner key={n} role="alert">
            <Icon name="warning" /> {i.saved}
          </Banner>
        ))}

      <Tabs label={format.section.plural}>
        {sectionNames.map((name) => (
          <Tab
            key={name}
            selected={name === section}
            onClick={() =>
              select(
                items.find((i) => i.section === name),
                name
              )
            }
          >
            {name} <span className="faint">{items.filter((i) => i.section === name).length}</span>
          </Tab>
        ))}
      </Tabs>

      {here.length === 0 ? (
        <div className="placeholder">
          {check.status === 'running' && !saved
            ? 'Checking…'
            : `Nothing to review in this ${format.section.singular}: every ${unit.singular} is complete.`}
        </div>
      ) : (
        <div className="check-layout">
          <CheckList
            items={shown}
            selected={selectedItem}
            onSelect={(item) => select(item)}
            onKeyDown={onKey}
            page={page}
            pages={pages}
            onPage={setPage}
          />
          {selectedItem && <CheckDetail item={selectedItem} options={options} />}
        </div>
      )}

      {confirming && (
        <ConfirmBox
          label="Save anyway"
          confirmLabel="Save anyway"
          onConfirm={saveAnyway}
          onCancel={() => setConfirming(false)}
        >
          Save with {count(issues, { singular: 'known issue', plural: 'known issues' })}? The{' '}
          {issues === 1 ? `${unit.singular} keeps its issue` : `${unit.plural} keep their issues`} in the saved file.
          Your original file is not changed.
        </ConfirmBox>
      )}
    </ScreenTemplate>
  )
}
