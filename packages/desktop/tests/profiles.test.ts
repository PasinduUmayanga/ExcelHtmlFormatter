import { describe, expect, it } from 'vitest'
import { defaultConfig, type AppConfig } from '@hf/core'
import {
  DEFAULT_PROFILE,
  MAX_PROFILES,
  activateProfile,
  createProfile,
  deleteProfile,
  parseOtherProfiles,
  profileName,
  renameProfile,
  summarize,
  type Profiles
} from '../src/main/profiles'

const named = (name: string, rules: AppConfig['rules'] = {}): AppConfig => ({
  ...defaultConfig(),
  profileName: name,
  rules
})
const start = (): Profiles => ({ active: named(DEFAULT_PROFILE, { mark: { bold: true } }), others: [] })

describe('formatting profiles (main process, ADR 0018)', () => {
  it('reads the other profiles: valid, unique, never a copy of the active one', () => {
    const active = start().active
    expect(parseOtherProfiles(null, active)).toEqual([])
    const list = parseOtherProfiles(
      { profiles: [named('Client A'), named('client a'), named('Default'), { nope: true }, named('B')] },
      active
    )
    expect(list.map((p) => p.profileName)).toEqual(['Client A', 'B'])
  })

  it('checks names: required, short, no duplicates (ignoring case)', () => {
    const p = start()
    expect(profileName('  Client A  ', p)).toBe('Client A')
    expect(() => profileName('   ', p)).toThrow('Give the profile a name.')
    expect(() => profileName('x'.repeat(61), p)).toThrow('up to 60')
    expect(() => profileName('default', p)).toThrow('already a profile called "default"')
    // Renaming a profile to its own name in another case is fine
    expect(profileName('DEFAULT', p, 'Default')).toBe('DEFAULT')
  })

  it('creates from the defaults or as a copy, without making it active', () => {
    let p = createProfile(start(), 'Copy', 'Default')
    p = createProfile(p, 'Fresh', null)
    expect(p.active.profileName).toBe(DEFAULT_PROFILE)
    expect(p.others.find((x) => x.profileName === 'Copy')!.rules).toEqual({ mark: { bold: true } })
    expect(p.others.find((x) => x.profileName === 'Fresh')!.rules).toEqual(defaultConfig().rules)
    expect(() => createProfile(p, 'X', 'Missing')).toThrow('no longer exists')
    // Copies are independent
    p.others[0].rules.mark = { italic: true }
    expect(p.active.rules.mark).toEqual({ bold: true })
  })

  it('switches, renames and deletes, keeping Default and the active profile', () => {
    let p = createProfile(start(), 'Client A', null)
    p = activateProfile(p, 'client a')
    expect(p.active.profileName).toBe('Client A')
    expect(p.others.map((x) => x.profileName)).toEqual(['Default'])
    expect(summarize(p)).toEqual([
      { name: 'Client A', ruleCount: Object.keys(defaultConfig().rules).length, active: true },
      { name: 'Default', ruleCount: 1, active: false }
    ])
    expect(() => deleteProfile(p, 'Client A')).toThrow('Switch to another profile')
    expect(() => deleteProfile(p, 'Default')).toThrow('Default profile cannot be deleted')
    p = renameProfile(p, 'Client A', 'Client B')
    expect(p.active.profileName).toBe('Client B')
    p = createProfile(p, 'Old', null)
    p = deleteProfile(p, 'Old')
    expect(p.others.map((x) => x.profileName)).toEqual(['Default'])
    expect(activateProfile(p, 'Client B')).toBe(p)
  })

  it('keeps at most MAX_PROFILES', () => {
    let p = start()
    for (let i = 1; i < MAX_PROFILES; i++) p = createProfile(p, `P${i}`, null)
    expect(() => createProfile(p, 'One more', null)).toThrow(`up to ${MAX_PROFILES} profiles`)
  })
})
