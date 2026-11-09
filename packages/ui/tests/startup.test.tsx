// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { defaultConfig, type ElectronApi } from '@hf/core'
import { useApp } from '../src/state/store'
import { StartupScreen } from '../src/design/templates'

let api: Partial<Record<keyof ElectronApi, ReturnType<typeof vi.fn>>>
beforeEach(() => {
  api = {
    onJobProgress: vi.fn(() => () => {}),
    loadConfig: vi.fn(async () => defaultConfig()),
    getAppInfo: vi.fn(async () => ({ version: '1', platform: 'win32', configPath: 'c' })),
    getActivity: vi.fn(async () => []),
    getPreferences: vi.fn(async () => ({ theme: 'system' }))
  }
  ;(window as unknown as { api: typeof api }).api = api
  useApp.setState({ startup: { status: 'loading', error: null }, config: null, appInfo: null })
})

describe('start-up (store)', () => {
  it('is ready once the settings and app details are loaded, listening for progress only once', async () => {
    await useApp.getState().init()
    await useApp.getState().init()
    expect(useApp.getState().startup).toEqual({ status: 'ready', error: null })
    expect(useApp.getState().config).toEqual(defaultConfig())
    expect(api.onJobProgress).toHaveBeenCalledTimes(1)
  })

  it('fails with the reason when the settings cannot be read, and Try again recovers', async () => {
    api.loadConfig!.mockRejectedValueOnce(
      new Error("Error invoking remote method 'config:load': Error: Disk not ready")
    )
    await useApp.getState().retryStartup()
    expect(useApp.getState().startup).toEqual({ status: 'failed', error: 'Disk not ready' })
    expect(api.getActivity).not.toHaveBeenCalled()
    await useApp.getState().retryStartup()
    expect(useApp.getState().startup.status).toBe('ready')
    expect(api.getActivity).toHaveBeenCalled()
  })

  it("doesn't fail start-up for the conveniences (recent activity, theme)", async () => {
    api.getActivity!.mockRejectedValueOnce(new Error('x'))
    api.getPreferences!.mockRejectedValueOnce(new Error('y'))
    await useApp.getState().retryStartup()
    expect(useApp.getState().startup.status).toBe('ready')
  })
})

describe('StartupScreen', () => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  let root: Root | null = null
  afterEach(() => act(() => root?.unmount()))

  it('says what is loading, with a progress bar that shows activity, not a made-up percentage', () => {
    const html = renderToStaticMarkup(
      <StartupScreen appName="FormaFlow" status="loading" error={null} onRetry={() => {}} />
    )
    expect(html).toContain('<p role="status" class="muted">Loading your settings…</p>')
    expect(html).toContain('role="progressbar"')
    expect(html).not.toContain('aria-valuenow')
  })

  it('explains a failure and retries on request', () => {
    const onRetry = vi.fn()
    const host = document.createElement('div')
    root = createRoot(host)
    act(() =>
      root!.render(<StartupScreen appName="FormaFlow" status="failed" error="Disk not ready" onRetry={onRetry} />)
    )
    const alert = host.querySelector('[role="alert"]')!
    expect(alert.textContent).toContain('Your settings could not be loaded.')
    expect(alert.textContent).toContain('Disk not ready')
    act(() => alert.querySelector('button')!.click())
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
