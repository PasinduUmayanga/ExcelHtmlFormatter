import { useNavigate } from '@tanstack/react-router'
import type { ActivityEntry } from '@hf/core'
import { useApp } from '../../state/store'
import { useFormatterApp } from '../../router'
import { describeActivity, formatWhen } from '../../utils/describeActivity'
import { Button, FileGlyph, Icon, glyphKindOf, type IconName } from '../atoms'

/** The short status of an entry, as recorded (never guessed). */
export function activityStatus(entry: ActivityEntry): { label: string; icon: IconName; tone: 'ok' | 'warn' | 'plain' } {
  if (entry.kind === 'opened') return { label: 'Opened', icon: 'file', tone: 'plain' }
  if (entry.check === 'verified') return { label: 'Formatted', icon: 'passed', tone: 'ok' }
  if (entry.check === 'differences') return { label: 'Saved with differences', icon: 'attention', tone: 'warn' }
  return { label: 'Saved, not checked', icon: 'neutral', tone: 'plain' }
}

/** Home's recent opens and saves (reference 01): file, status, time, and Open again (in that folder, ADR 0013). */
export function RecentActivity() {
  const { format } = useFormatterApp()
  const { activity, browseForFile, clearActivity, loading, startWorkflow } = useApp()
  const navigate = useNavigate()
  const openFrom = async (folder: string) => {
    startWorkflow()
    if (await browseForFile(folder)) navigate({ to: '/sections' })
  }

  return (
    <section className="recent" aria-labelledby="recent-title">
      <div className="section-head">
        <h2 id="recent-title" tabIndex={-1}>
          <Icon name="recent" size={22} />
          Recent Activity
        </h2>
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
          {activity.map((entry) => {
            const status = activityStatus(entry)
            return (
              <li key={`${entry.at}|${entry.kind}|${entry.folder}|${entry.fileName}`}>
                <FileGlyph kind={glyphKindOf(entry.fileName)} size={36} />
                <div className="activity-main">
                  <b>{entry.fileName}</b>
                  <div className="muted text-sm truncate" title={entry.folder}>
                    {entry.folder}
                  </div>
                </div>
                <span className={`activity-status ${status.tone}`} title={describeActivity(entry, format.unit)}>
                  <Icon name={status.icon} size={18} />
                  {status.label}
                </span>
                <time className="muted text-sm" dateTime={entry.at}>
                  {formatWhen(entry.at)}
                </time>
                <Button
                  small
                  disabled={loading}
                  aria-label={`Open again from ${entry.folder}`}
                  onClick={() => void openFrom(entry.folder)}
                >
                  <Icon name="folder" />
                  Open
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
