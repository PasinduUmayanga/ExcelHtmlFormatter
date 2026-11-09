import { Link } from '@tanstack/react-router'
import { isConfigured } from '@hf/core'
import { useApp } from '../../store'
import { Badge } from '../atoms'
import { Tabs, tabClass } from '../molecules'

/**
 * One tab per selected section, as links to the same screen for another section.
 * A tab shows how many of its tags still have no style.
 */
export function SectionTabs({
  screen,
  current,
  view
}: {
  screen: 'analysis' | 'preview'
  current: string
  view?: 'original'
}) {
  const { doc, selected, config } = useApp()
  if (!doc) return null
  const rules = config?.rules ?? {}

  return (
    <Tabs>
      {selected.map((name) => {
        const section = doc.sections.find((s) => s.name === name)
        const missing = section ? Object.keys(section.scan.tags).filter((t) => !isConfigured(t, rules)).length : 0
        const className = tabClass(current === name)
        const content = (
          <>
            {name}
            {missing > 0 && (
              <Badge tone="warn" title={`${missing} ${missing === 1 ? 'tag has' : 'tags have'} no style`}>
                {missing}
              </Badge>
            )}
          </>
        )
        return screen === 'analysis' ? (
          <Link
            key={name}
            role="tab"
            aria-selected={current === name}
            className={className}
            to="/analysis/$section"
            params={{ section: name }}
          >
            {content}
          </Link>
        ) : (
          <Link
            key={name}
            role="tab"
            aria-selected={current === name}
            className={className}
            to="/preview/$section"
            params={{ section: name }}
            search={view ? { view } : {}}
          >
            {content}
          </Link>
        )
      })}
    </Tabs>
  )
}
