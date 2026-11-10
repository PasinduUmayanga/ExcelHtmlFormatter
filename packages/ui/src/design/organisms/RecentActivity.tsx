import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import type { ActivityEntry } from '@hf/core'
import { useApp } from '../../state/store'
import { useFormatterApp } from '../../router'
import { describeActivity, formatWhen } from '../../utils/describeActivity'
import { Button, FileGlyph, Icon, glyphKindOf, type IconName } from '../atoms'
import { ConfirmBox } from '../molecules'

/** The short status of an entry, as recorded (never guessed). */
export function activityStatus(entry: ActivityEntry): { label: string; icon: IconName; tone: 'ok' | 'warn' | 'plain' } {
  if (entry.kind === 'opened') return { label: 'Opened', icon: 'file', tone: 'plain' }
  if (entry.check === 'verified') return { label: 'Formatted', icon: 'passed', tone: 'ok' }
  if (entry.check === 'differences') return { label: 'Saved with differences', icon: 'attention', tone: 'warn' }
  return { label: 'Saved, not checked', icon: 'neutral', tone: 'plain' }
}

/** Opening a recent or favourite file: the Open dialog in its folder (ADR 0013), then Upload. */
export function useOpenFrom() {
  const { browseForFile, startWorkflow } = useApp()
  const navigate = useNavigate()
  return async (folder: string) => {
    startWorkflow()
    if (await browseForFile(folder)) navigate({ to: '/upload' })
  }
}

/** A star that adds a file to Favorites or takes it off (stored by the main process, ADR 0017). */
export function FavoriteStar({ fileName, folder }: { fileName: string; folder: string }) {
  const { favorites, toggleFavorite } = useApp()
  const on = favorites.some((f) => f.fileName === fileName && f.folder === folder)
  return (
    <Button
      small
      className={on ? 'star on' : 'star'}
      aria-pressed={on}
      aria-label={`Favorite ${fileName}`}
      title={on ? 'Remove from Favorites' : 'Add to Favorites'}
      onClick={() => void toggleFavorite(fileName, folder)}
    >
      <Icon name="favorites" />
    </Button>
  )
}

/**
 * Recent opens and saves (Home, My Workspace, Recent Files): file, status, time, Open again (in that folder), a
 * favourite star, and Clear (asks first). `limit` shows only the newest few, with "View all" to Recent Files.
 */
export function RecentActivity({ limit, title = 'Recent Activity' }: { limit?: number; title?: string }) {
  const { format } = useFormatterApp()
  const { activity, clearActivity, loading } = useApp()
  const openFrom = useOpenFrom()
  const [confirming, setConfirming] = useState(false)
  const shown = limit ? activity.slice(0, limit) : activity

  return (
    <section className="recent" aria-labelledby="recent-title">
      <div className="section-head">
        <h2 id="recent-title" tabIndex={-1}>
          <Icon name="recent" size={22} />
          {title}
        </h2>
        <div className="row">
          {limit !== undefined && activity.length > 0 && (
            <Link to="/recent" className="btn small link">
              View all <Icon name="next" />
            </Link>
          )}
          {activity.length > 0 && (
            <Button small onClick={() => setConfirming(true)}>
              Clear
            </Button>
          )}
        </div>
      </div>
      {confirming && (
        <ConfirmBox
          label="Clear recent activity"
          confirmLabel="Clear"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false)
            void clearActivity()
          }}
        >
          Clear the list of recent files? Your files are not touched, and Favorites stay.
        </ConfirmBox>
      )}
      {activity.length === 0 ? (
        <p className="placeholder">Nothing yet. Files you open and save appear here. They are kept on this computer.</p>
      ) : (
        <ul className="activity">
          {shown.map((entry) => {
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
                <span className="row nowrap">
                  <Button
                    small
                    disabled={loading}
                    aria-label={`Open again from ${entry.folder}`}
                    onClick={() => void openFrom(entry.folder)}
                  >
                    <Icon name="folder" />
                    Open
                  </Button>
                  <FavoriteStar fileName={entry.fileName} folder={entry.folder} />
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
