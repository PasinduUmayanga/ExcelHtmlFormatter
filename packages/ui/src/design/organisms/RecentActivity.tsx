import { useNavigate } from '@tanstack/react-router'
import { useApp } from '../../state/store'
import { describeActivity, formatWhen } from '../../utils/describeActivity'
import { useFormatterApp } from '../../router'
import { Button, Icon } from '../atoms'

/** The Home screen's list of recent opens and saves, with "Open again" and "Clear". */
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
