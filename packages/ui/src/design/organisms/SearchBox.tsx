import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useApp } from '../../state/store'
import { useFormatterApp } from '../../router'
import { useHelp } from '../../hooks/useHelp'
import { FILE_ACTIONS, FILE_TYPES, availabilityOf, fileTypeOf } from '../../features/workflow/registry'
import { searchItems, type SearchItem } from '../../features/search/search'
import { cx } from '../../utils/cx'
import { Icon } from '../atoms'
import { useOpenFrom } from './RecentActivity'

const PAGES: { id: string; label: string; to: string; keywords?: string }[] = [
  { id: 'home', label: 'Home', to: '/', keywords: 'start new task file type action' },
  { id: 'workspace', label: 'My Workspace', to: '/workspace', keywords: 'resume continue task' },
  { id: 'recent', label: 'Recent Files', to: '/recent', keywords: 'history open again' },
  { id: 'favorites', label: 'Favorites', to: '/favorites', keywords: 'starred' },
  { id: 'profiles', label: 'Formatting Profiles', to: '/settings', keywords: 'tag styles rules' },
  { id: 'templates', label: 'Templates', to: '/templates', keywords: 'saved setup' },
  { id: 'automation', label: 'Automation (Beta)', to: '/automation' },
  { id: 'settings', label: 'Settings', to: '/preferences', keywords: 'theme appearance shortcuts about' },
  { id: 'help', label: 'Help & Support', to: '/help', keywords: 'guide faq' }
]

/**
 * The header search (prototype top bar): Ctrl+K focuses it, results appear as you type, the arrow keys move and Enter
 * opens one. A combobox with a listbox of options (WAI-ARIA pattern).
 */
export function SearchBox() {
  const { format } = useFormatterApp()
  const app = useApp()
  const { activity, favorites, templates, profiles } = app
  const { sections } = useHelp()
  const navigate = useNavigate()
  const openFrom = useOpenFrom()
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  // Ctrl+K (Cmd+K on a Mac) from anywhere in the window
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        input.current?.focus()
        input.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Everything that can be found, with what choosing it does
  const { items, run } = useMemo(() => {
    const items: SearchItem[] = []
    const run = new Map<string, () => void>()
    const add = (item: SearchItem, action: () => void) => {
      items.push(item)
      run.set(item.id, action)
    }
    for (const p of PAGES)
      add(
        { id: `page:${p.id}`, group: 'Pages', label: p.label, keywords: p.keywords },
        () => void navigate({ to: p.to })
      )
    for (const t of FILE_TYPES)
      add(
        {
          id: `type:${t.id}`,
          group: 'File types',
          label: t.label,
          hint: t.extensions.join(', '),
          keywords: t.description
        },
        () => {
          app.setHomeType(t.id, format.id)
          void navigate({ to: '/' })
        }
      )
    for (const a of FILE_ACTIONS) {
      const ready = availabilityOf(a, format.id) === 'ready'
      add(
        {
          id: `action:${a.id}`,
          group: 'Actions',
          label: `${a.label} (${fileTypeOf(a.sourceType).label})`,
          hint: ready ? a.description : 'Coming soon',
          keywords: fileTypeOf(a.sourceType).extensions.join(' ')
        },
        () => {
          app.setHomeType(a.sourceType, format.id)
          if (ready) app.setHomeAction(a.id)
          void navigate({ to: '/' })
        }
      )
    }
    for (const t of templates)
      add({ id: `template:${t.name}`, group: 'Templates', label: t.name, hint: `Template · ${t.profile}` }, () => {
        void app.startTemplate(t, format.id).then((ok) => {
          if (ok) void navigate({ to: '/upload' })
        })
      })
    for (const f of favorites)
      add(
        { id: `favorite:${f.folder}|${f.fileName}`, group: 'Favorites', label: f.fileName, hint: f.folder },
        () => void openFrom(f.folder)
      )
    for (const e of activity)
      if (!run.has(`recent:${e.folder}|${e.fileName}`))
        add(
          { id: `recent:${e.folder}|${e.fileName}`, group: 'Recent files', label: e.fileName, hint: e.folder },
          () => void openFrom(e.folder)
        )
    for (const p of profiles)
      add(
        {
          id: `profile:${p.name}`,
          group: 'Profiles',
          label: p.name,
          hint: `${p.ruleCount} tag rules${p.active ? ' · active' : ''}`
        },
        () => void navigate({ to: '/settings', search: { tag: undefined, back: undefined } })
      )
    for (const s of sections) {
      const id = `help:${s.topic.id}#${s.anchor ?? ''}`
      if (run.has(id)) continue
      add(
        { id, group: 'Help', label: s.heading ? `${s.topic.title} › ${s.heading}` : s.topic.title, keywords: s.text },
        () =>
          void navigate({
            to: '/help/$topic',
            params: { topic: s.topic.id },
            search: { section: s.anchor ?? undefined }
          })
      )
    }
    return { items, run }
  }, [activity, favorites, templates, profiles, sections, format.id, app, navigate, openFrom])

  const results = useMemo(() => searchItems(items, query), [items, query])
  const open = results.length > 0
  const choose = (item: SearchItem | undefined) => {
    if (!item) return
    setQuery('')
    input.current?.blur()
    run.get(item.id)?.()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && open) setActive((i) => (i + 1) % results.length)
    else if (e.key === 'ArrowUp' && open) setActive((i) => (i - 1 + results.length) % results.length)
    else if (e.key === 'Enter' && open) choose(results[Math.min(active, results.length - 1)])
    else if (e.key === 'Escape') setQuery('')
    else return
    e.preventDefault()
  }

  return (
    <div className="search">
      <Icon name="search" />
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-label="Search files, actions, or help"
        aria-expanded={open}
        aria-controls="search-results"
        aria-autocomplete="list"
        aria-activedescendant={open ? `search-option-${Math.min(active, results.length - 1)}` : undefined}
        placeholder="Search files, actions, or help…"
        value={query}
        maxLength={100}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setQuery(''), 150)}
      />
      <kbd className="kbd" aria-hidden="true">
        Ctrl + K
      </kbd>
      {open && (
        <ul id="search-results" role="listbox" aria-label="Search results" className="search-results">
          {results.map((item, i) => (
            <li
              key={item.id}
              id={`search-option-${i}`}
              role="option"
              aria-selected={i === Math.min(active, results.length - 1)}
              className={cx(i === Math.min(active, results.length - 1) && 'active')}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(item)
              }}
            >
              {(i === 0 || results[i - 1].group !== item.group) && <span className="search-group">{item.group}</span>}
              <span className="search-label">{item.label}</span>
              {item.hint && <span className="search-hint">{item.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
