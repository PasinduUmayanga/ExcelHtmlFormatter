import { useApp } from '../state/store'
import { formatWhen } from '../utils/describeActivity'
import { Button, FileGlyph, Icon, glyphKindOf } from '../design/atoms'
import { FavoriteStar, useOpenFrom } from '../design/organisms'
import { ScreenTemplate } from '../design/templates'

/**
 * Favorites (prototype): the files you starred in Recent Files. Opening one shows the Open dialog in its folder,
 * like Open again (the window never opens a path by itself).
 */
export function Favorites() {
  const { favorites, loading } = useApp()
  const openFrom = useOpenFrom()
  return (
    <ScreenTemplate title="Favorites" intro="Files you starred, kept on this computer. Star a file in Recent Files.">
      {favorites.length === 0 ? (
        <p className="placeholder">
          No favorites yet. Use the <Icon name="favorites" /> star next to a recent file to keep it here.
        </p>
      ) : (
        <ul className="activity favorites">
          {favorites.map((f) => (
            <li key={`${f.folder}|${f.fileName}`}>
              <FileGlyph kind={glyphKindOf(f.fileName)} size={36} />
              <div className="activity-main">
                <b>{f.fileName}</b>
                <div className="muted text-sm truncate" title={f.folder}>
                  {f.folder}
                </div>
              </div>
              <time className="muted text-sm" dateTime={f.at}>
                Starred {formatWhen(f.at)}
              </time>
              <span className="row nowrap">
                <Button
                  small
                  disabled={loading}
                  aria-label={`Open again from ${f.folder}`}
                  onClick={() => void openFrom(f.folder)}
                >
                  <Icon name="folder" />
                  Open
                </Button>
                <FavoriteStar fileName={f.fileName} folder={f.folder} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </ScreenTemplate>
  )
}
