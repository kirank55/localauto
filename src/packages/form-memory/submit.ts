import { matchProfileSlot } from './lib/profile-slot'
import { readFields } from './lib/read-fields'
import { activeProfile, writeActiveProfile, type MemoryState, type Profile } from './memory'

export type SubmitOffer = {
  heardAt: number
  title: string
  href: string
  tabId: number | null
  windowId: number | null
  profile: Partial<Profile>
}

const PROFILE_KEYS = ['fullName', 'email', 'phone', 'linkedin', 'github', 'website'] as const
const TEXT_CAP = 500
const TITLE_CAP = 200
const HREF_CAP = 2000

export function profileFromForm(form: HTMLFormElement): Partial<Profile> {
  const profile: Partial<Profile> = {}
  let first = ''
  let last = ''
  for (const field of readFields(form.ownerDocument)) {
    if (field.skip || !field.currentValue) continue
    if (!field.elements.some((element) => form.contains(element))) continue
    const slot = matchProfileSlot(field)
    const value = field.currentValue.trim().slice(0, TEXT_CAP)
    if (!slot || !value) continue
    if (slot === 'firstName') first = value
    else if (slot === 'lastName') last = value
    else profile[slot] = value
  }
  if (!profile.fullName && (first || last)) profile.fullName = [first, last].filter(Boolean).join(' ')
  return profile
}

export function mergeSubmitOffer(state: MemoryState, offer: Partial<Profile>): MemoryState {
  const next = { ...activeProfile(state) }
  for (const key of PROFILE_KEYS) {
    const value = offer[key]?.trim()
    if (value) next[key] = value.slice(0, TEXT_CAP)
  }
  return writeActiveProfile(state, next)
}

export function summarizeProfile(profile: Partial<Profile>): string {
  const parts = [profile.fullName, profile.email, profile.phone, profile.linkedin, profile.github, profile.website]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
  return parts.slice(0, 3).join(' · ')
}

export function parseSubmitOffer(raw: unknown): SubmitOffer | null {
  if (!isRecord(raw) || typeof raw.heardAt !== 'number' || !Number.isFinite(raw.heardAt)) return null
  const profile = profileFromUnknown(raw.profile)
  if (!profile) return null
  return {
    heardAt: raw.heardAt,
    title: text(raw.title, TITLE_CAP),
    href: text(raw.href, HREF_CAP),
    tabId: id(raw.tabId),
    windowId: id(raw.windowId),
    profile,
  }
}

export function readSubmittedProfileMessage(value: unknown): { profile: Partial<Profile>; title: string; href: string } | null {
  if (!isRecord(value) || value.type !== 'localauto:submitted-profile') return null
  const profile = profileFromUnknown(value.profile)
  if (!profile) return null
  return { profile, title: text(value.title, TITLE_CAP), href: text(value.href, HREF_CAP) }
}

function profileFromUnknown(raw: unknown): Partial<Profile> | null {
  if (!isRecord(raw)) return null
  const profile: Partial<Profile> = {}
  for (const key of PROFILE_KEYS) {
    const value = raw[key]
    if (typeof value !== 'string') continue
    const trimmed = value.trim().slice(0, TEXT_CAP)
    if (trimmed) profile[key] = trimmed
  }
  return Object.keys(profile).length > 0 ? profile : null
}

function text(value: unknown, cap: number): string {
  return typeof value === 'string' ? value.trim().slice(0, cap) : ''
}

function id(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
