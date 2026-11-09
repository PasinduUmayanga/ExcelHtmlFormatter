import { useNavigate } from '@tanstack/react-router'
import { count, defaultConfig, type ExportResult } from '@hf/core'
import { useApp } from '../../store'
import { useFormatterApp } from '../../router'
import { Button, Icon } from '../atoms'

const fallbackConfig = defaultConfig()

/** The success box after saving: what was done, any known issues, and whether the saved file checked out. */
export function SaveSummary({
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
        <b>
          <Icon name="check" /> Saved {result.fileName}
        </b>
        <div className="success-detail">
          {details.join(', ')}.
          {stats.unknownTags.length > 0 &&
            ` Tags with no style (${stats.unknownTags.map((t) => `<${t}>`).join(', ')}) were ${action}.`}{' '}
          Your original file was not changed.
        </div>
        <div className="success-detail">
          {stats.check.issues > 0 && (
            <Button variant="link" onClick={() => review(false)}>
              <Icon name="warning" /> Saved with{' '}
              {count(stats.check.issues, { singular: 'known issue', plural: 'known issues' })} →
            </Button>
          )}{' '}
          {verification === null ? (
            <span className="faint">The saved file was not checked (stopped).</span>
          ) : verification.differences === 0 ? (
            <span>
              <Icon name="check" /> Verified: the saved file matches ({count(verification.compared, unit)} compared).
            </span>
          ) : (
            <Button variant="link" onClick={() => review(true)}>
              <Icon name="warning" /> The saved file has{' '}
              {count(verification.differences, { singular: 'difference', plural: 'differences' })}. Review →
            </Button>
          )}
        </div>
      </div>
      <div className="row nowrap">
        <Button small onClick={onShow}>
          Show in folder
        </Button>
        <Button small onClick={onDismiss} aria-label="Dismiss">
          <Icon name="close" />
        </Button>
      </div>
    </div>
  )
}
