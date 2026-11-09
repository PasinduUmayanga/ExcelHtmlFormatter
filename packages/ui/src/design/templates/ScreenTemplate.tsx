import type { ReactNode } from 'react'

/**
 * The layout every screen shares: its title, one line saying what it is for, the content, and a footer
 * with the way back on the left and the next step on the right.
 */
export function ScreenTemplate({
  title,
  intro,
  footer,
  children
}: {
  title: ReactNode
  intro: ReactNode
  /** Usually two items: back (left) and next (right) */
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <h1>{title}</h1>
      <p className="sub">{intro}</p>
      {children}
      {footer && <div className="footer">{footer}</div>}
    </>
  )
}
