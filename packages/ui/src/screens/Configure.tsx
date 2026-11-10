import { Link, getRouteApi, useNavigate } from '@tanstack/react-router'
import { useApp } from '../state/store'
import { useFormatterApp } from '../router'
import { cx } from '../utils/cx'
import { Button, Icon } from '../design/atoms'
import { SectionPicker, SectionTabs, SectionTags } from '../design/organisms'
import { WorkflowTemplate } from '../design/templates'

const route = getRouteApi('/configure')

/**
 * Step 4, Configure (prototype): a narrow Sheets / Tag Styles switcher beside the chosen panel. Sheets picks what is
 * converted; Tag Styles shows, per selected sheet, the tags found and the style each gets. Replaces the separate
 * Select sheets and Tag analysis screens.
 */
export function Configure() {
  const { format } = useFormatterApp()
  const { tab, section } = route.useSearch()
  const { doc, selected, config, profiles, activateProfile } = useApp()
  const navigate = useNavigate()
  if (!doc) return null

  const words = format.section
  const current = tab === 'tags' ? 'tags' : 'sheets'
  const shown = section && selected.includes(section) ? section : selected[0]
  const tabs = [
    { id: 'sheets', label: `${words.plural.charAt(0).toUpperCase()}${words.plural.slice(1)}`, icon: 'table' },
    { id: 'tags', label: 'Tag Styles', icon: 'profiles' }
  ] as const

  return (
    <WorkflowTemplate
      step="configure"
      title="Configure processing"
      intro={`Choose ${words.plural} and formatting rules before processing.`}
      back={<Button onClick={() => navigate({ to: '/upload' })}>← Back</Button>}
      next={
        <>
          <span className="muted">{selected.length} selected</span>
          <Button
            variant="primary"
            disabled={selected.length === 0}
            onClick={() =>
              navigate({
                to: '/preview/$section',
                params: { section: current === 'tags' && shown ? shown : selected[0] },
                search: {}
              })
            }
          >
            Continue →
          </Button>
        </>
      }
    >
      <div className="config-frame">
        <nav className="config-menu" aria-label="Configure">
          {tabs.map((t) => (
            <Link
              key={t.id}
              to="/configure"
              search={{ tab: t.id === 'tags' ? 'tags' : undefined, section: t.id === 'tags' ? shown : undefined }}
              className={cx('config-tab', current === t.id && 'active')}
              aria-current={current === t.id ? 'page' : undefined}
              disabled={t.id === 'tags' && selected.length === 0}
            >
              <Icon name={t.icon} size={18} />
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="config-panel">
          {current === 'sheets' ? (
            <SectionPicker />
          ) : (
            <div className="config-area">
              <h2>HTML tag styles</h2>
              <div className="profile-row">
                <label htmlFor="active-profile" className="muted">
                  Active profile
                </label>
                <select
                  id="active-profile"
                  value={config?.profileName ?? ''}
                  onChange={(e) => void activateProfile(e.target.value)}
                >
                  {profiles.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} ({p.ruleCount} tag rules)
                    </option>
                  ))}
                </select>
                <Link to="/settings" search={{ tag: undefined, back: undefined }} className="btn small">
                  Manage profiles
                </Link>
              </div>
              {shown ? (
                <>
                  <SectionTabs screen="configure" current={shown} />
                  <SectionTags name={shown} />
                </>
              ) : (
                <div className="placeholder">Select a {words.singular} to see its tags.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </WorkflowTemplate>
  )
}
