import type { ButtonHTMLAttributes } from 'react'
import { cx } from '../cx'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary: the screen's main action; link: looks like a text link (inside banners and messages) */
  variant?: 'default' | 'primary' | 'link'
  /** Compact size, for buttons inside rows, banners and panels */
  small?: boolean
}

/** Every button in the window that looks like a button (`.btn`). */
export function Button({ variant = 'default', small = false, className, ...props }: ButtonProps) {
  return <button className={cx('btn', small && 'small', variant !== 'default' && variant, className)} {...props} />
}
