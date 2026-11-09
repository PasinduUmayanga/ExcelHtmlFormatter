import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react'
import { describeCheckItem, type CheckItem } from '@hf/core'
import { cx } from '../../utils/cx'
import { Badge, Button, Icon } from '../atoms'

/**
 * One page of the content check's items, as a keyboard-friendly list box, with Previous/Next when there are
 * more pages. The screen owns the selection and the page; this only shows them.
 */
export function CheckList({
  items,
  selected,
  onSelect,
  onKeyDown,
  page,
  pages,
  onPage
}: {
  items: CheckItem[]
  selected: CheckItem | undefined
  onSelect: (item: CheckItem) => void
  onKeyDown: (e: KeyboardEvent) => void
  page: number
  pages: number
  onPage: (page: number) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  useScrollToSelected(listRef, selected?.location)

  return (
    <div
      className="check-list"
      role="listbox"
      aria-label="Items to review"
      tabIndex={0}
      ref={listRef}
      onKeyDown={onKeyDown}
      aria-activedescendant={selected ? `check-${selected.location}` : undefined}
    >
      {items.map((item) => (
        <div
          key={item.location}
          id={`check-${item.location}`}
          role="option"
          aria-selected={item === selected}
          className={cx('check-row', item === selected && 'active')}
          onClick={() => onSelect(item)}
        >
          <Badge tone={item.severity === 'issue' ? 'warn' : undefined}>
            <Icon name={item.severity === 'issue' ? 'warning' : 'info'} /> {item.location || '—'}
          </Badge>
          <span className="check-desc">{describeCheckItem(item)}</span>
        </div>
      ))}
      {pages > 1 && (
        <div className="row pager">
          <Button small disabled={page === 0} onClick={() => onPage(page - 1)}>
            ← Previous
          </Button>
          <span className="faint">
            Page {page + 1} of {pages}
          </span>
          <Button small disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>
            Next →
          </Button>
        </div>
      )}
    </div>
  )
}

/** Scrolls the selected row into view when it changes (keyboard navigation). */
function useScrollToSelected(listRef: RefObject<HTMLDivElement | null>, location: string | undefined) {
  useEffect(() => {
    if (!location) return
    listRef.current?.querySelector(`[id="check-${CSS.escape(location)}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [listRef, location])
}
