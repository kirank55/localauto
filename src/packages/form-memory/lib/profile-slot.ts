import type { Profile } from '../memory'
import type { ReadField } from './read-fields'
import { canonicalize, hasPhrase } from './text'

export type ProfileSlot =
  | 'email'
  | 'phone'
  | 'linkedin'
  | 'github'
  | 'website'
  | 'firstName'
  | 'lastName'
  | 'fullName'

const SHORT_LABEL_WORDS = 4

export function matchProfileSlot(field: ReadField): ProfileSlot | null {
  if (field.skip) return null
  if (field.kind !== 'text' && field.kind !== 'textarea') return null

  const nameHay = canonicalize(`${field.name} ${field.id} ${field.autocomplete} ${field.placeholder}`)
  const label = canonicalize(field.label)
  const auto = field.autocomplete.toLowerCase()
  const type = field.inputType

  if (type === 'email' || auto === 'email' || hasPhrase(nameHay, 'email') || shortLabel(label, ['email', 'email address'])) {
    return 'email'
  }
  if (
    type === 'tel' ||
    auto === 'tel' ||
    auto === 'tel-national' ||
    hasPhrase(nameHay, 'phone') ||
    hasPhrase(nameHay, 'mobile') ||
    shortLabel(label, ['phone', 'mobile', 'phone number'])
  ) {
    return 'phone'
  }
  if (hasPhrase(nameHay, 'linkedin') || hasPhrase(label, 'linkedin')) return 'linkedin'
  if (hasPhrase(nameHay, 'github') || hasPhrase(label, 'github')) return 'github'
  if (!hasPhrase(label, 'company') && !hasPhrase(nameHay, 'company') && isWebsite(nameHay, label, type, auto)) {
    return 'website'
  }
  if (
    auto === 'given-name' ||
    hasPhrase(nameHay, 'first name') ||
    hasPhrase(nameHay, 'given name') ||
    shortLabel(label, ['first name', 'given name'])
  ) {
    return 'firstName'
  }
  if (
    auto === 'family-name' ||
    hasPhrase(nameHay, 'last name') ||
    hasPhrase(nameHay, 'family name') ||
    hasPhrase(nameHay, 'surname') ||
    shortLabel(label, ['last name', 'family name', 'surname'])
  ) {
    return 'lastName'
  }
  if (hasPhrase(nameHay, 'username') || hasPhrase(label, 'username') || hasPhrase(label, 'company')) return null
  if (
    auto === 'name' ||
    hasPhrase(nameHay, 'full name') ||
    nameTokensAreJustName(nameHay) ||
    shortLabel(label, ['name', 'full name', 'legal name', 'your name', 'candidate name', 'preferred name'])
  ) {
    return 'fullName'
  }
  return null
}

export function valueForSlot(profile: Profile, slot: ProfileSlot): string {
  const { first, last } = splitName(profile.fullName)
  switch (slot) {
    case 'email':
      return profile.email.trim()
    case 'phone':
      return profile.phone.trim()
    case 'linkedin':
      return profile.linkedin.trim()
    case 'github':
      return profile.github.trim()
    case 'website':
      return profile.website.trim()
    case 'firstName':
      return first
    case 'lastName':
      return last
    case 'fullName':
      return profile.fullName.trim()
  }
}

export function slotDetail(slot: ProfileSlot): string {
  switch (slot) {
    case 'email':
      return 'Profile email'
    case 'phone':
      return 'Profile phone'
    case 'linkedin':
      return 'Profile LinkedIn'
    case 'github':
      return 'Profile GitHub'
    case 'website':
      return 'Profile website'
    case 'firstName':
      return 'Profile first name'
    case 'lastName':
      return 'Profile last name'
    case 'fullName':
      return 'Profile name'
  }
}

function isWebsite(nameHay: string, label: string, type: string, auto: string): boolean {
  if (hasPhrase(nameHay, 'portfolio') || hasPhrase(label, 'portfolio')) return true
  if (hasPhrase(nameHay, 'website') || shortLabel(label, ['website', 'personal site', 'personal website'])) return true
  if (hasPhrase(nameHay, 'urls') && hasPhrase(nameHay, 'other')) return true
  return type === 'url' || auto === 'url'
}

function shortLabel(label: string, phrases: readonly string[]): boolean {
  if (!label) return false
  if (label.split(' ').filter(Boolean).length > SHORT_LABEL_WORDS) return false
  return phrases.some((phrase) => label === phrase || hasPhrase(label, phrase))
}

function nameTokensAreJustName(nameHay: string): boolean {
  const tokens = nameHay.split(' ').filter(Boolean)
  return tokens.length > 0 && tokens.every((token) => token === 'name')
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  const first = parts[0] ?? ''
  if (parts.length < 2) return { first, last: '' }
  return { first, last: parts.slice(1).join(' ') }
}
