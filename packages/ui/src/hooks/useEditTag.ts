import { useNavigate, useRouterState } from '@tanstack/react-router'

/**
 * Opens Tag styles on one tag. The current address goes into `?back=`, so the
 * "Done" button there returns to exactly this screen (same section and view).
 */
export function useEditTag() {
  const navigate = useNavigate()
  const here = useRouterState({ select: (s) => s.location.href })
  return (tag: string) => navigate({ to: '/settings', search: { tag, back: here } })
}
