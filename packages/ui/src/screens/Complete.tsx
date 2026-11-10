import { useNavigate } from '@tanstack/react-router'
import { capitalize, count, mergeScans } from '@hf/core'
import { useApp } from '../state/store'
import { useFormatterApp } from '../router'
import { actionOf, fileTypeOf } from '../features/workflow/registry'
import { Button, Icon } from '../design/atoms'
import { Field } from '../design/molecules'
import { ProcessingPanel, SaveSummary } from '../design/organisms'
import { WorkflowTemplate } from '../design/templates'

/**
 * Step 6, Export & complete (prototype): before saving, the output name and what will be saved; after a clean save,
 * what was saved with Open file, Show in folder and New task (redesign decision R3: this replaces going back to Home).
 */
export function Complete() {
  const { format } = useFormatterApp()
  const app = useApp()
  const { doc, selected, homeType, homeAction, exporting, exportResult, lastSaved, lastSavedSource } = app
  const navigate = useNavigate()
  const { unit } = format
  const action = actionOf(homeAction)?.label ?? 'Format HTML tags'

  const newTask = () => {
    app.dismissLastSaved()
    navigate({ to: '/' })
  }

  // After a clean save the file is closed: show what was saved.
  if (!doc && lastSaved) {
    const { stats, verification } = lastSaved
    return (
      <WorkflowTemplate
        step="export"
        title="Export & complete"
        intro="Your formatted file is saved. The original file was not changed."
        back={<Button onClick={newTask}>← New task</Button>}
        next={
          <Button variant="primary" onClick={newTask}>
            Back to Home →
          </Button>
        }
      >
        <div className="complete">
          <div className="complete-main">
            <Icon name="passed" size={72} />
            <h2>Processing completed!</h2>
            <p className="muted">
              {verification
                ? 'Your file has been formatted and the saved copy was checked.'
                : 'Your file has been formatted. The saved copy was not checked.'}
            </p>
            <div className="row">
              <Button variant="primary" onClick={() => void app.openSavedFile()}>
                <Icon name="file" /> Open file
              </Button>
              <Button onClick={app.showInFolder}>
                <Icon name="folder" /> Show in folder
              </Button>
            </div>
          </div>
          <dl className="complete-summary" aria-label="Summary">
            <div>
              <dt>File</dt>
              <dd>{lastSavedSource ?? '–'}</dd>
            </div>
            <div>
              <dt>Action</dt>
              <dd>{action}</dd>
            </div>
            <div>
              <dt>{capitalize(format.section.plural)} processed</dt>
              <dd>{stats.sections.length}</dd>
            </div>
            <div>
              <dt>{capitalize(unit.plural)} formatted</dt>
              <dd>{stats.converted.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Saved as</dt>
              <dd>{lastSaved.fileName}</dd>
            </div>
            <div>
              <dt>Saved file check</dt>
              <dd>
                {verification === null
                  ? 'Not checked'
                  : verification.differences === 0
                    ? 'Verified'
                    : count(verification.differences, { singular: 'difference', plural: 'differences' })}
              </dd>
            </div>
          </dl>
        </div>
        <SaveSummary result={lastSaved} onShow={app.showInFolder} onDismiss={newTask} />
      </WorkflowTemplate>
    )
  }
  if (!doc) return null

  const chosen = doc.sections.filter((s) => selected.includes(s.name))
  const merged = mergeScans(chosen.map((s) => s.scan))
  const usual = `${doc.file.name.replace(/\.[^.]+$/, '')}${format.outputSuffix}.${format.outputExtension}`

  const save = async () => {
    const outcome = await app.exportDocument()
    if (outcome === 'review') {
      const first = useApp.getState().check.report?.items.find((i) => i.severity === 'issue')
      navigate({
        to: '/check/$section',
        params: { section: first?.section ?? selected[0] },
        search: { cell: first?.location, saved: undefined }
      })
    }
  }

  return (
    <WorkflowTemplate
      step="export"
      title="Export & complete"
      intro="Review the output summary and save your result."
      back={
        <Button onClick={() => navigate({ to: '/preview/$section', params: { section: selected[0] }, search: {} })}>
          ← Back
        </Button>
      }
      next={
        <>
          <span className="faint text-sm save-note">{format.text.saveNote}</span>
          <Button variant="primary" onClick={save} disabled={exporting || selected.length === 0}>
            {exporting ? (
              app.check.status === 'running' ? (
                'Checking…'
              ) : (
                'Saving…'
              )
            ) : (
              <>
                <Icon name="save" /> Save formatted file…
              </>
            )}
          </Button>
        </>
      }
    >
      <ProcessingPanel items={unit.plural} />
      {exportResult && (
        <SaveSummary result={exportResult} onShow={app.showInFolder} onDismiss={app.dismissExportResult} />
      )}
      <div className="export-panel">
        <Field label="Output name" htmlFor="output-name">
          <input
            id="output-name"
            aria-describedby="output-name-hint"
            type="text"
            value={app.outputName}
            placeholder={usual}
            maxLength={200}
            onChange={(e) => app.setOutputName(e.target.value)}
          />
        </Field>
        <p id="output-name-hint" className="muted text-sm">
          The Save dialog starts with this name. Leave it empty for {usual}.
        </p>
        <dl className="complete-summary" aria-label="What will be saved">
          <div>
            <dt>File type</dt>
            <dd>{fileTypeOf(homeType).label}</dd>
          </div>
          <div>
            <dt>Operation</dt>
            <dd>{action}</dd>
          </div>
          <div>
            <dt>{capitalize(format.section.plural)} selected</dt>
            <dd>{count(selected.length, format.section)}</dd>
          </div>
          <div>
            <dt>{capitalize(unit.plural)} to format</dt>
            <dd>{merged.htmlCells.toLocaleString()}</dd>
          </div>
        </dl>
      </div>
    </WorkflowTemplate>
  )
}
