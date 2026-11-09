import { useNavigate } from '@tanstack/react-router'
import { count, type ActivityEntry } from '@hf/core'
import { useApp } from '../../store'
import { useFormatterApp } from '../../router'
import { Button, Icon } from '../atoms'

type Words = { singular: string; plural: string }

/** One line about what happened, e.g. "Saved from report.xlsx · 41 cells formatted · verified". */
export function describeActivity(entry: ActivityEntry, unit: Words): string {
  if (entry.kind === 'opened') return 'Opened'
  const parts = [entry.sourceName ? `Saved from ${entry.sourceName}` : 'Saved']
  if (entry.converted !== undefined) parts.push(`${count(entry.converted, unit)} formatted`)
  if (entry.check === 'verified') parts.push('saved file verified')
  if (entry.check === 'differences') {
    parts.push(`${count(entry.differences ?? 0, { singular: 'difference', plural: 'differences' })} in the saved file`)
  }
  if (entry.check === 'not-checked') parts.push('saved file not checked')
  return parts.join(' · ')
}

/** When it happened: "Today, 14:05", "Yesterday, 09:30" or "7 Nov 2026, 16:45" (local time). */
export function formatWhen(iso: string, now = new Date()): string {
  const at = new Date(iso)
  const time = at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((day(now) - day(at)) / 86_400_000)
  if (days === 0) return `Today, ${time}`
  if (days === 1) return `Yesterday, ${time}`
  return `${at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${time}`
}

/** The Home screen's list of recent opens and saves, with "Open again" and "Clear". */
export function RecentActivity() {
  const { format } = useFormatterApp()
  const { activity, browseForFile, clearActivity, loading } = useApp()
  const navigate = useNavigate()
  const openFrom = async (folder: string) => {
    if (await browseForFile(folder)) navigate({ to: '/sections' })
  }

  return (
    <section className="recent" aria-labelledby="recent-title">
      <div className="row spread">
        <h2 id="recent-title">Recent activity</h2>
        {activity.length > 0 && (
          <Button small onClick={() => void clearActivity()}>
            Clear
          </Button>
        )}
      </div>
      {activity.length === 0 ? (
        <p className="placeholder">Nothing yet. Files you open and save appear here. They are kept on this computer.</p>
      ) : (
        <ul className="activity">
          {activity.map((entry) => (
            <li key={`${entry.at}|${entry.kind}|${entry.folder}|${entry.fileName}`}>
              <span className="activity-icon" aria-hidden>
                <Icon name={entry.kind === 'saved' ? 'save' : 'file'} />
              </span>
              <div className="activity-main">
                <div>
                  <b>{entry.fileName}</b> <span className="muted">· {describeActivity(entry, format.unit)}</span>
                </div>
                <div className="faint text-sm truncate" title={entry.folder}>
                  {entry.folder}
                </div>
              </div>
              <time className="muted text-sm" dateTime={entry.at}>
                {formatWhen(entry.at)}
              </time>
              <Button
                small
                disabled={loading}
                aria-label={`Open again from ${entry.folder}`}
                onClick={() => void openFrom(entry.folder)}
              >
                Open again
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
