import { useState, type DragEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { PickedFile } from '@hf/core'
import { cleanError, useApp } from '../store'
import { useFormatterApp } from '../router'
import { JobProgressPanel } from '../components/JobProgress'

export function OpenFile() {
  const { format } = useFormatterApp()
  const { openFile, setError, loading, pendingFile } = useApp()
  const navigate = useNavigate()
  const [over, setOver] = useState(false)

  async function open(file: PickedFile) {
    if (await openFile(file)) navigate({ to: '/sections' })
  }

  async function browse() {
    if (loading) return
    try {
      const file = await window.api.openFileDialog()
      if (file) await open(file)
    } catch (e) {
      setError(cleanError(e))
    }
  }

  async function onDrop(e: DragEvent) {
    e.preventDefault()
    setOver(false)
    const dropped = e.dataTransfer.files[0]
    if (!dropped || loading) return
    try {
      await open(await window.api.describeDroppedFile(dropped))
    } catch (err) {
      setError(cleanError(err))
    }
  }

  return (
    <>
      <h1>{format.text.openTitle}</h1>
      <p className="sub">{format.text.openHint}</p>
      {loading ? (
        <JobProgressPanel title={`Opening ${pendingFile?.name ?? 'the file'}`} items={format.unit.plural} />
      ) : (
        <button
          className={`drop ${over ? 'over' : ''}`}
          onClick={browse}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <div className="big">📄</div>
          <b>{format.text.dropHint}</b>
          <span style={{ color: 'var(--muted)' }}>The original file is never changed</span>
        </button>
      )}
    </>
  )
}
