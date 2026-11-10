import { useState, type FormEvent } from 'react'
import { useApp } from '../../state/store'
import { Badge, Button, Icon } from '../atoms'
import { ConfirmBox } from '../molecules'

/**
 * Formatting Profiles (prototype, ADR 0018): every saved set of tag styles, with Use (make active), Rename,
 * Duplicate and Delete, and a form to create one from the default styles. The active profile is edited below it.
 */
export function ProfileManager() {
  const { profiles, createProfile, renameProfile, deleteProfile, activateProfile } = useApp()
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (await createProfile(newName, null)) setNewName('')
  }
  const rename = async (e: FormEvent) => {
    e.preventDefault()
    if (renaming && (await renameProfile(renaming.from, renaming.to))) setRenaming(null)
  }
  // A free "<name> copy" name for Duplicate
  const copyName = (name: string) => {
    const taken = new Set(profiles.map((p) => p.name.toLowerCase()))
    for (let i = 1; ; i++) {
      const candidate = i === 1 ? `${name} copy` : `${name} copy ${i}`
      if (!taken.has(candidate.toLowerCase())) return candidate.slice(0, 60)
    }
  }

  return (
    <section className="profiles" aria-labelledby="profiles-title">
      <h2 id="profiles-title">Profiles</h2>
      {deleting && (
        <ConfirmBox
          label="Delete profile"
          confirmLabel="Delete"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            void deleteProfile(deleting)
            setDeleting(null)
          }}
        >
          Delete the profile "{deleting}" and its tag styles? This can't be undone.
        </ConfirmBox>
      )}
      <ul className="profile-list">
        {profiles.map((p) => (
          <li key={p.name} className={p.active ? 'active' : undefined}>
            {renaming?.from === p.name ? (
              <form className="row" onSubmit={rename}>
                <input
                  aria-label={`New name for ${p.name}`}
                  value={renaming.to}
                  maxLength={60}
                  autoFocus
                  onChange={(e) => setRenaming({ from: p.name, to: e.target.value })}
                />
                <Button small variant="primary" type="submit">
                  Save
                </Button>
                <Button small type="button" onClick={() => setRenaming(null)}>
                  Cancel
                </Button>
              </form>
            ) : (
              <div className="profile-name">
                <Icon name="profiles" size={18} />
                <b>{p.name}</b>
                {p.active && <Badge tone="ok">Active</Badge>}
                <span className="muted text-sm">{p.ruleCount} tag rules</span>
              </div>
            )}
            <div className="row">
              {!p.active && (
                <Button small variant="primary" onClick={() => void activateProfile(p.name)}>
                  Use
                </Button>
              )}
              <Button small onClick={() => setRenaming({ from: p.name, to: p.name })} aria-label={`Rename ${p.name}`}>
                Rename
              </Button>
              <Button
                small
                onClick={() => void createProfile(copyName(p.name), p.name)}
                aria-label={`Duplicate ${p.name}`}
              >
                Duplicate
              </Button>
              {!p.active && p.name.toLowerCase() !== 'default' && (
                <Button small onClick={() => setDeleting(p.name)} aria-label={`Delete ${p.name}`}>
                  Delete
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <form className="row profile-create" onSubmit={create}>
        <input
          aria-label="New profile name"
          placeholder="New profile name"
          value={newName}
          maxLength={60}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button type="submit" disabled={!newName.trim()}>
          <Icon name="profiles" /> Create a profile
        </Button>
      </form>
      <p className="muted text-sm">New profiles start with the default styles. Use Duplicate to copy one.</p>
    </section>
  )
}
