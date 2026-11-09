import { useNavigate } from '@tanstack/react-router'
import { Icon, type IconName } from '../atoms'

/**
 * Home's shortcuts (prototype "Quick Actions"), only to things that exist: the recent files further down, Tag styles
 * (Formatting Profiles) and Help.
 */
export function QuickActions() {
  const navigate = useNavigate()
  const showRecent = () => {
    const heading = document.getElementById('recent-title')
    heading?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    heading?.focus({ preventScroll: true })
  }
  const items: { icon: IconName; title: string; hint: string; run: () => void }[] = [
    { icon: 'recent', title: 'Open recent', hint: 'Pick up a recent file', run: showRecent },
    {
      icon: 'profiles',
      title: 'Formatting Profiles',
      hint: 'Manage tag styles',
      run: () => void navigate({ to: '/settings' })
    },
    { icon: 'help', title: 'Help & guides', hint: 'How FormaFlow works', run: () => void navigate({ to: '/help' }) }
  ]
  return (
    <section className="quick" aria-labelledby="quick-title">
      <h2 id="quick-title" className="column-title">
        Quick actions
      </h2>
      <div className="quick-grid">
        {items.map((item) => (
          <button key={item.title} type="button" className="quick-action" onClick={item.run}>
            <Icon name={item.icon} size={22} />
            <span>
              <b>{item.title}</b>
              <span className="muted text-sm">{item.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
