import type { AriaRole, ReactNode } from 'react'
import { Button } from '../atoms'

/** A highlighted message across the screen (`.banner`), with an optional action on the right. */
export function Banner({
  children,
  action,
  role,
  label
}: {
  children: ReactNode
  action?: ReactNode
  /** status: information that appeared; alert: a problem; alertdialog: a question to answer (see ConfirmBox) */
  role?: AriaRole
  /** Accessible name, for banners that are dialogs */
  label?: string
}) {
  return (
    <div className="banner" role={role} aria-label={label}>
      <span>{children}</span>
      {action}
    </div>
  )
}

/** A question asked in the page (not a browser dialog), answered with Cancel or the action. */
export function ConfirmBox({
  label,
  confirmLabel,
  onConfirm,
  onCancel,
  children
}: {
  label: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  children: ReactNode
}) {
  return (
    <Banner
      role="alertdialog"
      label={label}
      action={
        <div className="row">
          <Button small onClick={onCancel}>
            Cancel
          </Button>
          <Button small variant="primary" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {children}
    </Banner>
  )
}
