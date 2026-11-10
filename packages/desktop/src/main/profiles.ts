import { defaultConfig, validateConfig, type AppConfig, type ProfileSummary } from '@hf/core'

/**
 * Formatting profiles (ADR 0018). The active profile is config.json, unchanged, so every reader of the settings keeps
 * working and older versions still read it. The other profiles live in profiles.json. Switching swaps one in.
 * Plain functions, no Electron, so they can be unit-tested; index.ts reads and writes the files.
 */
export interface Profiles {
  active: AppConfig
  others: AppConfig[]
}

export const MAX_PROFILES = 30
/** The profile every install starts with; it can't be deleted. */
export const DEFAULT_PROFILE = defaultConfig().profileName

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** The stored other profiles: valid ones only, unique names, never the active one's name. Never throws. */
export function parseOtherProfiles(data: unknown, active: AppConfig): AppConfig[] {
  const list = data && typeof data === 'object' ? (data as { profiles?: unknown }).profiles : undefined
  if (!Array.isArray(list)) return []
  const out: AppConfig[] = []
  for (const item of list) {
    let profile: AppConfig
    try {
      profile = validateConfig(item)
    } catch {
      continue
    }
    if (
      sameName(profile.profileName, active.profileName) ||
      out.some((p) => sameName(p.profileName, profile.profileName))
    )
      continue
    out.push(profile)
    if (out.length === MAX_PROFILES - 1) break
  }
  return out
}

/** A profile name typed by the user: 1–60 characters, no control characters, not already used. Throws why not. */
export function profileName(input: unknown, profiles: Profiles, except?: string): string {
  // eslint-disable-next-line no-control-regex
  const name = typeof input === 'string' ? input.replace(/[\u0000-\u001f]/g, '').trim() : ''
  if (!name) throw new Error('Give the profile a name.')
  if (name.length > 60) throw new Error('Use a name of up to 60 characters.')
  const taken = [profiles.active, ...profiles.others].some(
    (p) => sameName(p.profileName, name) && !(except !== undefined && sameName(p.profileName, except))
  )
  if (taken) throw new Error(`There is already a profile called "${name}".`)
  return name
}

const find = (profiles: Profiles, name: unknown): AppConfig => {
  const profile =
    typeof name === 'string' ? [profiles.active, ...profiles.others].find((p) => sameName(p.profileName, name)) : null
  if (!profile) throw new Error('That profile no longer exists.')
  return profile
}

/** The list the window shows: the active profile first, then the others by name. */
export function summarize(profiles: Profiles): ProfileSummary[] {
  const row = (p: AppConfig, active: boolean) => ({
    name: p.profileName,
    ruleCount: Object.keys(p.rules).length,
    active
  })
  return [
    row(profiles.active, true),
    ...[...profiles.others].sort((a, b) => a.profileName.localeCompare(b.profileName)).map((p) => row(p, false))
  ]
}

/** A new profile: the default styles, or a copy of another profile. It is not made active. */
export function createProfile(profiles: Profiles, name: unknown, copyFrom: unknown): Profiles {
  if (profiles.others.length + 1 >= MAX_PROFILES) throw new Error(`You can keep up to ${MAX_PROFILES} profiles.`)
  const clean = profileName(name, profiles)
  const source = copyFrom === null || copyFrom === undefined ? defaultConfig() : find(profiles, copyFrom)
  const profile: AppConfig = { ...structuredClone(source), profileName: clean }
  return { active: profiles.active, others: [...profiles.others, profile] }
}

export function renameProfile(profiles: Profiles, from: unknown, to: unknown): Profiles {
  const profile = find(profiles, from)
  const clean = profileName(to, profiles, profile.profileName)
  const rename = (p: AppConfig) => (p === profile ? { ...p, profileName: clean } : p)
  return { active: rename(profiles.active), others: profiles.others.map(rename) }
}

/** Deletes a profile that is neither active nor the Default profile. */
export function deleteProfile(profiles: Profiles, name: unknown): Profiles {
  const profile = find(profiles, name)
  if (profile === profiles.active) throw new Error('Switch to another profile before deleting this one.')
  if (sameName(profile.profileName, DEFAULT_PROFILE)) throw new Error('The Default profile cannot be deleted.')
  return { active: profiles.active, others: profiles.others.filter((p) => p !== profile) }
}

/** Makes a profile the active one (the old active profile joins the others). */
export function activateProfile(profiles: Profiles, name: unknown): Profiles {
  const profile = find(profiles, name)
  if (profile === profiles.active) return profiles
  return { active: profile, others: [...profiles.others.filter((p) => p !== profile), profiles.active] }
}
