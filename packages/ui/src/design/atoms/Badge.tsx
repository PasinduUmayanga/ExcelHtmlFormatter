import type { HTMLAttributes } from 'react'
import { cx } from '../../utils/cx'

export type Tone = 'ok' | 'warn' | 'info' | 'muted'

/** A small rounded label for a status or a count (`.chip`). Without a tone it is neutral. */
export function Badge({ tone, className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cx('chip', tone, className)} {...props} />
}
