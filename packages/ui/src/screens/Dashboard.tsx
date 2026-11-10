import { useNavigate, useRouter } from '@tanstack/react-router'
import { useApp } from '../state/store'
import { useFormatterApp } from '../router'
import {
  FILE_TYPES,
  actionOf,
  actionsFor,
  availabilityOf,
  fileTypeOf,
  type FileTypeId
} from '../features/workflow/registry'
import { Badge, Button, FileGlyph, Icon } from '../design/atoms'
import { HeroArt, JourneySteps, RadioCards, WaveArt } from '../design/molecules'
import { QuickActions, RecentActivity, SaveSummary } from '../design/organisms'

const JOURNEY = [
  { title: 'Select file type', hint: 'Choose your input document' },
  { title: 'Choose action', hint: 'Pick what you want to do' },
  { title: 'Process & export', hint: 'Preview, check and save' }
] as const

/**
 * Home (redesign screen A, "Blue Shiny Wave" prototype): choose the kind of file, then the action, then Continue to
 * the workflow. Only actions this app implements can be chosen; the others are listed as "Coming soon".
 */
export function Dashboard() {
  const { format } = useFormatterApp()
  const app = useApp()
  const { doc, lastStep, loading, startWorkflow, lastSaved, showInFolder, dismissLastSaved } = app
  const { homeType, homeAction, setHomeType, setHomeAction } = app
  const navigate = useNavigate()
  const router = useRouter()

  const type = fileTypeOf(homeType)
  const actions = actionsFor(homeType)
  const chosen = actionOf(homeAction)
  const ready = chosen !== null && chosen.sourceType === homeType && availabilityOf(chosen, format.id) === 'ready'

  // Continue unlocks the workflow; the Open screen has drag-and-drop and the reading progress.
  const start = () => {
    if (!ready) return
    startWorkflow()
    navigate({ to: '/upload' })
  }

  return (
    <div className="home">
      <WaveArt />
      <header className="home-hero">
        <div>
          <h1>
            Welcome to <span className="brand-word">FormaFlow</span>
          </h1>
          <p className="sub">Format, convert and prepare your documents with confidence.</p>
        </div>
        <HeroArt />
      </header>

      <JourneySteps steps={JOURNEY} current={ready ? 2 : 1} />

      {lastSaved && <SaveSummary result={lastSaved} onShow={showInFolder} onDismiss={dismissLastSaved} />}

      {doc && (
        <div className="resume" role="region" aria-label="Your open file">
          <Icon name="workspace" size={20} />
          <span>
            You're working on <b>{doc.file.name}</b>. Pick up where you left off.
          </span>
          <Button variant="primary" small onClick={() => router.history.push(lastStep ?? '/configure')}>
            Continue →
          </Button>
        </div>
      )}

      {/* Reading order is step 1, step 2, quick actions; wide windows place quick actions under step 1. */}
      <div className="home-columns">
        <section className="home-type" aria-labelledby="step-type">
          <h2 id="step-type" className="column-title">
            Step 1: Select file type
          </h2>
          <RadioCards<FileTypeId>
            label="File type"
            className="type-cards"
            value={homeType}
            options={FILE_TYPES.map((t) => ({ value: t.id }))}
            onChange={(id) => setHomeType(id, format.id)}
            renderCard={(option, checked) => {
              const t = fileTypeOf(option.value)
              return (
                <>
                  <FileGlyph kind={t.id} size={52} />
                  <span className="card-title">{t.label}</span>
                  <span className="card-ext">{t.extensions.join(', ')}</span>
                  <span className="card-desc">{t.description}</span>
                  {checked && (
                    <span className="check-mark on" aria-hidden="true">
                      <Icon name="check" size={12} />
                    </span>
                  )}
                </>
              )
            }}
          />
        </section>

        <section className="home-action" aria-labelledby="step-action">
          <h2 id="step-action" className="column-title">
            Step 2: Choose an action for {type.label}
          </h2>
          <RadioCards
            label={`Action for ${type.label}`}
            className="action-list"
            value={ready ? homeAction : null}
            options={actions.map((a) => ({ value: a.id, disabled: availabilityOf(a, format.id) !== 'ready' }))}
            onChange={(id) => setHomeAction(id)}
            renderCard={(option, checked) => {
              const a = actionOf(option.value)!
              return (
                <>
                  <span className="action-icon">
                    <Icon name={a.icon} size={22} />
                  </span>
                  <span className="card-body">
                    <span className="card-title">{a.label}</span>
                    <span className="card-desc">{a.description}</span>
                  </span>
                  {option.disabled && <Badge tone="muted">Coming soon</Badge>}
                  <span className={checked ? 'radio-dot on' : 'radio-dot'} aria-hidden="true" />
                </>
              )
            }}
          />
          <div className="continue-row">
            <p className={ready ? 'availability ready' : 'availability'}>
              {ready ? (
                <>
                  <Icon name="passed" size={16} />
                  Available now: select {article(type.label)} {type.label} file and {chosen!.next}.
                </>
              ) : (
                `Nothing for ${type.label} files can be started yet: these actions are coming soon.`
              )}
            </p>
            <Button variant="primary" disabled={!ready || loading} onClick={start}>
              Continue
              <Icon name="next" size={18} />
            </Button>
          </div>
        </section>

        <QuickActions />
      </div>

      <RecentActivity limit={5} />
    </div>
  )
}

const article = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a')
