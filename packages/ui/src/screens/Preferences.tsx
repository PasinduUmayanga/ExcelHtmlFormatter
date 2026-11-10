import type { ThemeChoice } from '@hf/core'
import { useApp } from '../state/store'
import { useFormatterApp } from '../router'
import { Icon } from '../design/atoms'
import { SegmentedControl } from '../design/molecules'
import { ScreenTemplate } from '../design/templates'

const THEMES = [
  ['light', 'Light', 'sun'],
  ['dark', 'Dark', 'moon'],
  ['system', 'System', 'monitor']
] as const satisfies readonly (readonly [ThemeChoice, string, 'sun' | 'moon' | 'monitor'])[]

/** Settings (prototype): appearance, how files are kept safe (built in, nothing to switch off), shortcuts, About. */
export function Preferences() {
  const { format } = useFormatterApp()
  const { theme, setTheme, appInfo } = useApp()
  return (
    <ScreenTemplate title="Settings" intro={`How ${format.appName} looks and works on this computer.`}>
      <div className="settings-grid">
        <section className="panel" aria-labelledby="set-appearance">
          <h2 id="set-appearance">Appearance</h2>
          <p className="muted">Light, dark, or follow your system.</p>
          <SegmentedControl label="Theme" value={theme} options={THEMES} onChange={(next) => void setTheme(next)} />
        </section>
        <section className="panel" aria-labelledby="set-safety">
          <h2 id="set-safety">Document safety</h2>
          <p className="muted">Always on; these can't be switched off.</p>
          <ul className="promises">
            {[
              'Your original file is never changed or overwritten',
              'The formatted copy is saved where you choose',
              'Content is checked before saving, and the saved file after',
              'Files stay on this computer; nothing is uploaded'
            ].map((t) => (
              <li key={t}>
                <Icon name="passed" size={16} /> {t}
              </li>
            ))}
          </ul>
        </section>
        <section className="panel" aria-labelledby="set-keys">
          <h2 id="set-keys">Keyboard shortcuts</h2>
          <dl className="complete-summary">
            <div>
              <dt>Search</dt>
              <dd>
                <kbd className="kbd">Ctrl + K</kbd>
              </dd>
            </div>
            <div>
              <dt>Move between cards and options</dt>
              <dd>
                <kbd className="kbd">Arrow keys</kbd>
              </dd>
            </div>
            <div>
              <dt>Close search results</dt>
              <dd>
                <kbd className="kbd">Esc</kbd>
              </dd>
            </div>
          </dl>
        </section>
        <section className="panel" aria-labelledby="set-about">
          <h2 id="set-about">About</h2>
          <dl className="complete-summary">
            <div>
              <dt>Version</dt>
              <dd>{appInfo ? `${format.appName} ${appInfo.version}` : '…'}</dd>
            </div>
            <div>
              <dt>Settings file</dt>
              <dd className="code">{appInfo?.configPath ?? '…'}</dd>
            </div>
          </dl>
        </section>
      </div>
    </ScreenTemplate>
  )
}
