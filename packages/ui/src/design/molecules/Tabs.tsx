import type { ReactNode } from 'react'
import { cx } from '../cx'

/** A row of tabs (`.tabs`). The tabs inside are links (TanStack `Link` with `tabClass`) or `Tab` buttons. */
export function Tabs({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {children}
    </div>
  )
}

/** The classes of one tab, for tabs that are links. */
export const tabClass = (selected: boolean) => cx('tab', selected && 'active')

/** A tab that is a button (it changes what the screen shows without being a separate address). */
export function Tab({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button role="tab" aria-selected={selected} className={tabClass(selected)} onClick={onClick}>
      {children}
    </button>
  )
}
