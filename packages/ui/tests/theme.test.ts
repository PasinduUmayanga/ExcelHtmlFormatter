// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultConfig, type ElectronApi } from '@hf/core'
import { useApp } from '../src/state/store'

let api: Partial<Record<keyof ElectronApi, ReturnType<typeof vi.fn>>>
beforeEach(() => {
  api = {
    onJobProgress: vi.fn(() => () => {}),
    loadConfig: vi.fn(async () => defaultConfig()),
    getAppInfo: vi.fn(async () => ({ version: '1', platform: 'win32', configPath: 'c' })),
    getActivity: vi.fn(async () => []),
    getPreferences: vi.fn(async () => ({ theme: 'dark' })),
    setTheme: vi.fn(async () => {})
  }
  ;(window as unknown as { api: typeof api }).api = api
  useApp.setState({ theme: 'system', error: null })
})

describe('theme (store)', () => {
  it('shows the saved theme after start-up', async () => {
    await useApp.getState().init()
    expect(useApp.getState().theme).toBe('dark')
  })

  it('keeps System when the preferences cannot be read', async () => {
    api.getPreferences!.mockRejectedValueOnce(new Error('disk'))
    await useApp.getState().init()
    expect(useApp.getState().theme).toBe('system')
    expect(useApp.getState().error).toBeNull()
  })

  it('applies a new theme, and goes back to the previous one if that fails', async () => {
    await useApp.getState().setTheme('light')
    expect(api.setTheme).toHaveBeenCalledWith('light')
    expect(useApp.getState().theme).toBe('light')
    api.setTheme!.mockRejectedValueOnce(new Error('Error: Unknown theme.'))
    await useApp.getState().setTheme('dark')
    expect(useApp.getState().theme).toBe('light')
    expect(useApp.getState().error).toBe('Could not change the theme. Unknown theme.')
  })
})
