import { Link } from '@tanstack/react-router'
import { Icon } from '../atoms'

export interface Crumb {
  label: string
  /** An in-app address; the last crumb (the current page) has none */
  to?: string
}

/** Where the user is: Home › … › the current page (the current page is not a link). */
export function Breadcrumbs({ items }: { items: readonly Crumb[] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <ol>
        <li>
          <Link to="/" className="crumb-home" aria-label="Home page">
            <Icon name="home" size={18} />
          </Link>
        </li>
        {items.map((crumb, i) => (
          <li key={`${i}-${crumb.label}`}>
            <Icon name="chevron" size={14} />
            {crumb.to ? (
              <a href={`#${crumb.to}`}>{crumb.label}</a>
            ) : (
              <span aria-current={i === items.length - 1 ? 'page' : undefined}>{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
