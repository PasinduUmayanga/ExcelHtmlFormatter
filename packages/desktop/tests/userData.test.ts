import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { userDataPath } from '../src/main/userData'

describe('userDataPath (settings folder after a product rename)', () => {
  const appData = join('C:', 'Users', 'me', 'AppData', 'Roaming')

  it('keeps the earlier folder, so saved settings are found after the rename', () => {
    expect(userDataPath(appData, 'Excel HTML Formatter', false)).toBe(join(appData, 'Excel HTML Formatter'))
  })

  it("keeps Electron's default when no folder is given, or when --user-data-dir is used", () => {
    expect(userDataPath(appData, undefined, false)).toBeNull()
    expect(userDataPath(appData, 'Excel HTML Formatter', true)).toBeNull()
  })

  it('accepts only a plain folder name', () => {
    for (const bad of ['..', '.', ' ', 'a/b', 'a\\b', '../x']) {
      expect(() => userDataPath(appData, bad, false)).toThrow('plain folder name')
    }
  })
})
