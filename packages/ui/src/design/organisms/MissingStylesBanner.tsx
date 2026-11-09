import type { ReactNode } from 'react'
import { useEditTag } from '../../hooks/useEditTag'
import { Button, Icon } from '../atoms'
import { Banner } from '../molecules'

/**
 * Warns that some tags have no style, with a link to style the first one. Each screen words the message
 * itself (one sheet or the whole selection), so the text is passed in.
 */
export function MissingStylesBanner({ firstTag, children }: { firstTag: string; children: ReactNode }) {
  const editTag = useEditTag()
  return (
    <Banner
      role="status"
      action={
        <Button variant="link" onClick={() => editTag(firstTag)}>
          Set a style →
        </Button>
      }
    >
      <Icon name="warning" /> {children}
    </Banner>
  )
}
