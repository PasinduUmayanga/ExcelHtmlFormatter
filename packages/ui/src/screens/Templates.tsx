import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { WorkflowTemplate } from '@hf/core'
import { useApp } from '../state/store'
import { useFormatterApp } from '../router'
import { FILE_ACTIONS, actionOf, availabilityOf, fileTypeOf } from '../features/workflow/registry'
import { Button, FileGlyph, Icon } from '../design/atoms'
import { ConfirmBox, Field } from '../design/molecules'
import { ScreenTemplate } from '../design/templates'

/**
 * Templates (prototype): saved setups — file type, action, profile and which sheets to tick — to start a task in one
 * click. Only actions this app can run can be saved.
 */
export function Templates() {
  const { format } = useFormatterApp()
  const { templates, profiles, config, saveTemplate, deleteTemplate, startTemplate } = useApp()
  const navigate = useNavigate()
  const ready = FILE_ACTIONS.filter((a) => availabilityOf(a, format.id) === 'ready')
  const [name, setName] = useState('')
  const [action, setAction] = useState(ready[0]?.id ?? '')
  const [profile, setProfile] = useState(config?.profileName ?? '')
  const [sheets, setSheets] = useState<'html' | 'all'>('html')
  const [deleting, setDeleting] = useState<string | null>(null)
  const words = format.section.plural

  const create = async (e: FormEvent) => {
    e.preventDefault()
    const chosen = actionOf(action)
    if (!chosen) return
    const ok = await saveTemplate({
      name: name.trim(),
      fileType: chosen.sourceType,
      action: chosen.id,
      profile: profile || config?.profileName || '',
      sheets
    })
    if (ok) setName('')
  }
  const start = async (t: WorkflowTemplate) => {
    if (await startTemplate(t, format.id)) navigate({ to: '/upload' })
  }

  return (
    <ScreenTemplate title="Templates" intro="Save a setup you use often, then start a task with it in one click.">
      {deleting && (
        <ConfirmBox
          label="Delete template"
          confirmLabel="Delete"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            void deleteTemplate(deleting)
            setDeleting(null)
          }}
        >
          Delete the template "{deleting}"?
        </ConfirmBox>
      )}
      {templates.length === 0 ? (
        <p className="placeholder">No templates yet. Create one below.</p>
      ) : (
        <ul className="profile-list template-list">
          {templates.map((t) => {
            const a = actionOf(t.action)
            return (
              <li key={t.name}>
                <div className="profile-name">
                  {a && <FileGlyph kind={fileTypeOf(a.sourceType).id} size={28} />}
                  <b>{t.name}</b>
                  <span className="muted text-sm">
                    {a ? `${fileTypeOf(a.sourceType).label} · ${a.label}` : 'Action no longer available'} · {t.profile}{' '}
                    · {t.sheets === 'all' ? `all ${words}` : `${words} with HTML`}
                  </span>
                </div>
                <div className="row">
                  <Button small variant="primary" onClick={() => void start(t)} aria-label={`Use ${t.name}`}>
                    Use <Icon name="next" />
                  </Button>
                  <Button small onClick={() => setDeleting(t.name)} aria-label={`Delete ${t.name}`}>
                    Delete
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <form className="editor template-form" onSubmit={create} aria-label="New template">
        <h2>Create a template</h2>
        <Field label="Name" htmlFor="template-name">
          <input id="template-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Action" htmlFor="template-action">
          <select id="template-action" value={action} onChange={(e) => setAction(e.target.value)}>
            {ready.map((a) => (
              <option key={a.id} value={a.id}>
                {fileTypeOf(a.sourceType).label} · {a.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Profile" htmlFor="template-profile">
          <select id="template-profile" value={profile} onChange={(e) => setProfile(e.target.value)}>
            {profiles.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Tick ${words}`} htmlFor="template-sheets">
          <select
            id="template-sheets"
            value={sheets}
            onChange={(e) => setSheets(e.target.value === 'all' ? 'all' : 'html')}
          >
            <option value="html">Visible {words} with HTML</option>
            <option value="all">All {words}</option>
          </select>
        </Field>
        <Button type="submit" variant="primary" disabled={!name.trim() || !action}>
          Save template
        </Button>
      </form>
    </ScreenTemplate>
  )
}
