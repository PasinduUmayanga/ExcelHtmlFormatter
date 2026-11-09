import { useState, type DragEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useApp } from '../store'
import { useFormatterApp } from '../router'
import { Icon } from '../design/atoms'
import { JobProgressPanel } from '../design/organisms'
import { ScreenTemplate } from '../design/templates'

export function OpenFile() {
  const { format } = useFormatterApp()
  const { browseForFile, openDroppedFile, loading, pendingFile } = useApp()
  const navigate = useNavigate()
  const [over, setOver] = useState(false)

  async function browse() {
    if (await browseForFile()) navigate({ to: '/sections' })
  }

  async function onDrop(e: DragEvent) {
    e.preventDefault()
    setOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && (await openDroppedFile(dropped))) navigate({ to: '/sections' })
  }

  return (
    <ScreenTemplate title={format.text.openTitle} intro={format.text.openHint}>
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
          <div className="big">
            <Icon name="file" />
          </div>
          <b>{format.text.dropHint}</b>
          <span className="muted">The original file is never changed</span>
        </button>
      )}
    </ScreenTemplate>
  )
}
