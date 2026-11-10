import { useApp } from '../../state/store'
import { actionOf, fileTypeOf } from '../../features/workflow/registry'
import { FileGlyph, Icon } from '../atoms'

/**
 * The "Workflow summary" panel beside every workflow screen (prototype): what was chosen, the file, the profile, and
 * the guarantees that are really kept (nothing simulated).
 */
export function WorkflowSummary() {
  const { homeType, homeAction, doc, config, selected } = useApp()
  const type = fileTypeOf(homeType)
  return (
    <aside className="summary" aria-labelledby="summary-title">
      <h2 id="summary-title">
        <Icon name="info" size={18} /> Workflow summary
      </h2>
      <dl>
        <div>
          <dt>File type</dt>
          <dd>
            <FileGlyph kind={type.id} size={22} /> {type.label}
          </dd>
        </div>
        <div>
          <dt>Action</dt>
          <dd>{actionOf(homeAction)?.label ?? 'None chosen'}</dd>
        </div>
        <div>
          <dt>Supported extensions</dt>
          <dd>
            {type.extensions.map((ext) => (
              <span key={ext} className="ext">
                {ext}
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt>File</dt>
          <dd className="summary-file" title={doc?.file.path}>
            {doc ? doc.file.name : 'Not selected'}
          </dd>
        </div>
        {doc && (
          <div>
            <dt>Selected</dt>
            <dd>
              {selected.length} of {doc.sections.length}
            </dd>
          </div>
        )}
        <div>
          <dt>Profile</dt>
          <dd>{config?.profileName ?? '…'}</dd>
        </div>
      </dl>
      <ul className="promises">
        {[
          'Guided six-step process',
          'Original files stay unchanged',
          'Preview before export',
          'Content checked before and after saving'
        ].map((text) => (
          <li key={text}>
            <Icon name="passed" size={16} /> {text}
          </li>
        ))}
      </ul>
    </aside>
  )
}
