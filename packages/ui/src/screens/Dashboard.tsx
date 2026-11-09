import { useNavigate, useRouter } from '@tanstack/react-router'
import { useApp } from '../store'
import { useFormatterApp } from '../router'
import { Badge, Button } from '../design/atoms'
import { FeatureCard } from '../design/molecules'
import { RecentActivity, SaveSummary } from '../design/organisms'
import { ScreenTemplate } from '../design/templates'

/**
 * Conversions to other formats (roadmap Phase 3, not built yet). Listed so users can see what is coming;
 * set `available` when one exists and give it an action.
 */
export const EXPORT_TARGETS: readonly { id: string; title: string; description: string; available: boolean }[] = [
  { id: 'pdf', title: 'Convert to PDF', description: 'Save the formatted document as a PDF file.', available: false },
  { id: 'word', title: 'Convert to Word', description: 'Save it as a Word document (.docx).', available: false },
  { id: 'txt', title: 'Convert to text', description: 'Save the text as a plain .txt file.', available: false }
]

/** Home: start or continue, see what is coming, open the tools, and recent activity. */
export function Dashboard() {
  const { format } = useFormatterApp()
  const { doc, lastStep, loading, startWorkflow, lastSaved, showInFolder, dismissLastSaved } = useApp()
  const navigate = useNavigate()
  const router = useRouter()

  // Picking this unlocks the workflow; the Open screen has drag-and-drop and the reading progress.
  const start = () => {
    startWorkflow()
    navigate({ to: '/open' })
  }

  return (
    <ScreenTemplate
      title={`Welcome to ${format.appName}`}
      intro="Turn HTML tags in your documents into real formatting. Your original files are never changed."
    >
      {lastSaved && <SaveSummary result={lastSaved} onShow={showInFolder} onDismiss={dismissLastSaved} />}

      <h2 className="section-title">Start</h2>
      <div className="cards">
        {doc && (
          <FeatureCard
            primary
            title={`Continue with ${doc.file.name}`}
            description="Pick up where you left off."
            action={
              <Button variant="primary" onClick={() => router.history.push(lastStep ?? '/sections')}>
                Continue →
              </Button>
            }
          />
        )}
        <FeatureCard
          primary={!doc}
          title={format.text.openTitle}
          description={format.text.openHint}
          action={
            <Button variant={doc ? 'default' : 'primary'} disabled={loading} onClick={start}>
              Choose a file →
            </Button>
          }
        />
        {EXPORT_TARGETS.map((target) => (
          <FeatureCard
            key={target.id}
            unavailable={!target.available}
            title={target.title}
            description={target.description}
            badge={<Badge tone="muted">Coming soon</Badge>}
            action={<Button disabled>Not available yet</Button>}
          />
        ))}
      </div>

      <h2 className="section-title">Tools</h2>
      <div className="cards">
        <FeatureCard
          title="Tag styles"
          description="Choose how each HTML tag looks: bold, colour, size and more. Used for every file."
          action={
            <Button onClick={() => navigate({ to: '/settings', search: { tag: undefined, back: undefined } })}>
              Open tag styles
            </Button>
          }
        />
        <FeatureCard
          title="Help"
          description="Guides, answers to common questions and what to do when something goes wrong."
          action={<Button onClick={() => navigate({ to: '/help', search: { q: undefined } })}>Open help</Button>}
        />
      </div>

      <RecentActivity />
    </ScreenTemplate>
  )
}
