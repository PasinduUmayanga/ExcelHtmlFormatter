import { RecentActivity } from '../design/organisms'
import { ScreenTemplate } from '../design/templates'

/** Recent Files (prototype): every recent open and save, with Open again, Favorites stars and Clear. */
export function RecentFiles() {
  return (
    <ScreenTemplate
      title="Recent Files"
      intro="The files you opened and saved most recently. The list is kept on this computer."
    >
      <RecentActivity title="Recent files" />
    </ScreenTemplate>
  )
}
