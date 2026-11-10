import { useState, type DragEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { count } from '@hf/core'
import { useApp } from '../state/store'
import { useFormatterApp } from '../router'
import { fileTypeOf } from '../features/workflow/registry'
import { formatSize } from '../utils/formatSize'
import { Button, FileGlyph, Icon } from '../design/atoms'
import { JobProgressPanel } from '../design/organisms'
import { WorkflowTemplate } from '../design/templates'

/**
 * Step 3, Upload (prototype): drop or choose a file, or load the sample that ships with the app. The chosen file is
 * read straight away; it stays here, with Remove, until Continue.
 */
export function Upload() {
  const { format } = useFormatterApp()
  const { browseForFile, openDroppedFile, openSample, closeFile, loading, pendingFile, doc, homeType } = useApp()
  const navigate = useNavigate()
  const [over, setOver] = useState(false)
  const type = fileTypeOf(homeType)

  async function onDrop(e: DragEvent) {
    e.preventDefault()
    setOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) await openDroppedFile(dropped)
  }

  return (
    <WorkflowTemplate
      step="upload"
      title={`Upload your ${type.label} file`}
      intro="Select the document you want to work on. Your original file will not be modified."
      back={<Button onClick={() => navigate({ to: '/' })}>← Back</Button>}
      next={
        <Button variant="primary" disabled={!doc || loading} onClick={() => navigate({ to: '/configure', search: {} })}>
          Continue →
        </Button>
      }
    >
      {loading ? (
        <JobProgressPanel title={`Opening ${pendingFile?.name ?? 'the file'}`} items={format.unit.plural} />
      ) : (
        <div
          className={over ? 'dropzone over' : 'dropzone'}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <FileGlyph kind={type.id} size={80} />
          <h2>Drag and drop your {type.label} file here</h2>
          <p className="muted">or browse from your computer</p>
          <Button variant="primary" onClick={() => void browseForFile()}>
            <Icon name="folder" /> Choose file
          </Button>
          <p className="smallnote">Supported formats: {type.extensions.join(', ')}</p>
        </div>
      )}

      {doc && !loading && (
        <div className="file-chosen" role="status" aria-label="Chosen file">
          <FileGlyph kind={type.id} size={40} />
          <div className="file-chosen-text">
            <b>{doc.file.name}</b>
            <span className="muted text-sm">
              {formatSize(doc.file.sizeBytes)} · {count(doc.sections.length, format.section)}
            </span>
          </div>
          <Button small onClick={closeFile}>
            <Icon name="close" /> Remove
          </Button>
        </div>
      )}

      <div className="try-sample">
        <div>
          <b>Try it without a file</b>
          <p className="muted text-sm">Open the sample workbook that comes with {format.appName}.</p>
        </div>
        <Button disabled={loading} onClick={() => void openSample()}>
          Load sample
        </Button>
      </div>
    </WorkflowTemplate>
  )
}
