import { useNavigate } from '@tanstack/react-router'
import { Icon, type IconName } from '../atoms'

/**
 * Home's shortcuts (prototype "Quick Actions"), only to things that exist: Recent Files, Formatting Profiles and
 * Templates.
 */
export function QuickActions() {
  const navigate = useNavigate()
  const items: { icon: IconName; title: string; hint: string; run: () => void }[] = [
    {
      icon: 'recent',
      title: 'Open recent',
      hint: 'Pick up a recent file',
      run: () => void navigate({ to: '/recent' })
    },
    {
      icon: 'profiles',
      title: 'Formatting Profiles',
      hint: 'Manage tag styles',
      run: () => void navigate({ to: '/settings' })
    },
    {
      icon: 'templates',
      title: 'Use a Template',
      hint: 'Start with a saved setup',
      run: () => void navigate({ to: '/templates' })
    }
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
