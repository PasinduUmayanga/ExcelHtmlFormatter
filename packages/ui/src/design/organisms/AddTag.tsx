import { useState, type FormEvent } from 'react'
import { BUILTIN_TAGS, builtinStyle, normalizeTagName } from '@hf/core'
import { useApp } from '../../state/store'
import { Button } from '../atoms'

/** Adds a tag to the list (or selects it if it is there already). */
export function AddTag({ onAdded }: { onAdded: (tag: string) => void }) {
  const { config, updateRule } = useApp()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const name = normalizeTagName(value)
    if (!name) return setError('Use letters and numbers, e.g. mark or h1')
    if (Object.hasOwn(BUILTIN_TAGS, name)) return setError(`<${name}> is built in and can't be styled`)
    // A new tag starts as bold so the change is visible (or with its built-in look); an existing one is just selected.
    if (config && !Object.hasOwn(config.rules, name)) updateRule(name, builtinStyle(name) ? {} : { bold: true })
    onAdded(name)
    setValue('')
    setError(null)
  }

  return (
    <form className="add-tag" onSubmit={submit}>
      <div className="row nowrap">
        <input
          type="text"
          aria-label="New tag name"
          placeholder="New tag, e.g. mark"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
        />
        <Button small type="submit">
          Add
        </Button>
      </div>
      {error && <div className="field-error">{error}</div>}
    </form>
  )
}
