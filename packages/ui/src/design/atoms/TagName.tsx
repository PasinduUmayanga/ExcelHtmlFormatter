import type { HTMLAttributes } from 'react'
import { cx } from '../cx'

/** An HTML tag's name shown as code, `<b>`. The name is text: React escapes it, it is never parsed as HTML. */
export function TagName({
  name,
  large = false,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { name: string; large?: boolean }) {
  return (
    // Three text nodes (as the screens had before): one node lays text out a fraction of a pixel differently.
    <span className={cx('tag', large && 'large', className)} {...props}>
      &lt;{name}&gt;
    </span>
  )
}
