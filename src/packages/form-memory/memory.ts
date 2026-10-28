import type { HostKey } from './hosts'
import { sameQuestion } from './lib/text'

export type Profile = {
  fullName: string
  email: string
  phone: string
  linkedin: string
  github: string
  website: string
}

export type Personality = {
  id: string
  name: string
  profile: Profile
}

export type SavedAnswer = {
  id: string
  question: string
  answer: string
  savedAt: number
  host: string
}

export type MemoryState = {
  personalities: Personality[]
  activePersonalityId: string
  answers: SavedAnswer[]
  enabledHosts: Record<HostKey, boolean>
  listenForSubmit: boolean
}

export type MemoryPersistence = {
  read(): Promise<unknown>
  write(value: unknown): Promise<void>
}

export type MemoryStore = {
  load(): Promise<MemoryState>
  save(state: MemoryState): Promise<void>
}

export const DEFAULT_PERSONALITY_ID = 'default'
export const PERSONALITY_LIMIT = 12

export const STARTER_PERSONALITIES: readonly { id: string; name: string }[] = [
  { id: DEFAULT_PERSONALITY_ID, name: 'Default' },
  { id: 'personal', name: 'Personal' },
  { id: 'work', name: 'Work' },
  { id: 'software-engineer', name: 'Software engineer' },
]

const ANSWER_CAP = 300
const NAME_CAP = 40

export function emptyProfile(): Profile {
  return { fullName: '', email: '', phone: '', linkedin: '', github: '', website: '' }
}

export function emptyMemory(): MemoryState {
  return {
    personalities: starterPersonalities(emptyProfile()),
    activePersonalityId: DEFAULT_PERSONALITY_ID,
    answers: [],
    enabledHosts: { greenhouse: true, lever: true, demo: true },
    listenForSubmit: true,
  }
}

export function activePersonality(state: MemoryState): Personality {
  const selected = state.personalities.find((personality) => personality.id === state.activePersonalityId)
  const fallback = state.personalities[0]
  return selected ?? fallback ?? { id: DEFAULT_PERSONALITY_ID, name: 'Default', profile: emptyProfile() }
}

export function activeProfile(state: MemoryState): Profile {
  return activePersonality(state).profile
}

export function selectPersonality(state: MemoryState, id: string): MemoryState {
  if (!state.personalities.some((personality) => personality.id === id)) return state
  return { ...state, activePersonalityId: id }
}

export function writeActiveProfile(state: MemoryState, profile: Profile): MemoryState {
  const activeId = activePersonality(state).id
  return {
    ...state,
    personalities: state.personalities.map((personality) =>
      personality.id === activeId ? { ...personality, profile: { ...profile } } : personality,
    ),
  }
}

export function addPersonality(state: MemoryState, name: string): MemoryState {
  const trimmed = cleanName(name)
  if (!trimmed) return state
  const existing = state.personalities.find((personality) => personality.name.toLowerCase() === trimmed.toLowerCase())
  if (existing) return { ...state, activePersonalityId: existing.id }
  if (state.personalities.length >= PERSONALITY_LIMIT) return state
  const id = uniquePersonalityId(
    slugify(trimmed),
    new Set(state.personalities.map((personality) => personality.id)),
  )
  return {
    ...state,
    personalities: [...state.personalities, { id, name: trimmed, profile: emptyProfile() }],
    activePersonalityId: id,
  }
}

export function removePersonality(state: MemoryState, id: string): MemoryState {
  if (id === DEFAULT_PERSONALITY_ID) return state
  if (!state.personalities.some((personality) => personality.id === id)) return state
  return {
    ...state,
    personalities: state.personalities.filter((personality) => personality.id !== id),
    activePersonalityId: state.activePersonalityId === id ? DEFAULT_PERSONALITY_ID : state.activePersonalityId,
  }
}

export function parseMemoryState(raw: unknown): MemoryState {
  if (!isRecord(raw)) return emptyMemory()
  const personalities = Array.isArray(raw.personalities)
    ? withDefaultFirst(parsePersonalities(raw.personalities))
    : starterPersonalities(parseProfile(raw.profile))
  const requested = typeof raw.activePersonalityId === 'string' ? raw.activePersonalityId : DEFAULT_PERSONALITY_ID
  const activePersonalityId = personalities.some((personality) => personality.id === requested)
    ? requested
    : DEFAULT_PERSONALITY_ID
  return {
    personalities,
    activePersonalityId,
    answers: parseAnswers(raw.answers),
    enabledHosts: parseHosts(raw.enabledHosts),
    listenForSubmit: boolOr(raw.listenForSubmit, true),
  }
}

export function createMemoryStore(persistence: MemoryPersistence): MemoryStore {
  return {
    async load() {
      return parseMemoryState(await persistence.read())
    },
    async save(state) {
      await persistence.write(parseMemoryState(state))
    },
  }
}

export function rememberAnswers(
  existing: readonly SavedAnswer[],
  confirmed: readonly { question: string; answer: string }[],
  meta: { now: number; host: string; newId: () => string },
): SavedAnswer[] {
  const next = [...existing]
  for (const item of confirmed) {
    const question = item.question.trim()
    const answer = item.answer.trim()
    if (!question || !answer) continue
    const index = next.findIndex((saved) => sameQuestion(saved.question, question))
    const previous = index >= 0 ? next[index] : undefined
    if (previous) {
      next.splice(index, 1)
      next.push({ ...previous, question, answer, savedAt: meta.now, host: meta.host })
    } else {
      next.push({ id: meta.newId(), question, answer, savedAt: meta.now, host: meta.host })
    }
  }
  return next.slice(-ANSWER_CAP)
}

function starterPersonalities(defaultProfile: Profile): Personality[] {
  return STARTER_PERSONALITIES.map((preset) => ({
    id: preset.id,
    name: preset.name,
    profile: preset.id === DEFAULT_PERSONALITY_ID ? { ...defaultProfile } : emptyProfile(),
  }))
}

function withDefaultFirst(personalities: Personality[]): Personality[] {
  const current = personalities.find((personality) => personality.id === DEFAULT_PERSONALITY_ID)
  const rest = personalities.filter((personality) => personality.id !== DEFAULT_PERSONALITY_ID)
  const fallback: Personality = { id: DEFAULT_PERSONALITY_ID, name: 'Default', profile: emptyProfile() }
  return [current ?? fallback, ...rest].slice(0, PERSONALITY_LIMIT)
}

function parsePersonalities(value: unknown[]): Personality[] {
  const personalities: Personality[] = []
  const seen = new Set<string>()
  for (const item of value) {
    if (!isRecord(item)) continue
    const id = typeof item.id === 'string' ? item.id : ''
    if (!/^[a-z0-9-]{1,48}$/.test(id) || seen.has(id)) continue
    const name = cleanName(typeof item.name === 'string' ? item.name : '') || (id === DEFAULT_PERSONALITY_ID ? 'Default' : id)
    seen.add(id)
    personalities.push({ id, name, profile: parseProfile(item.profile) })
  }
  return personalities
}

function parseProfile(value: unknown): Profile {
  const empty = emptyProfile()
  if (!isRecord(value)) return empty
  return {
    fullName: stringOr(value.fullName, empty.fullName),
    email: stringOr(value.email, empty.email),
    phone: stringOr(value.phone, empty.phone),
    linkedin: stringOr(value.linkedin, empty.linkedin),
    github: stringOr(value.github, empty.github),
    website: stringOr(value.website, empty.website),
  }
}

function parseAnswers(value: unknown): SavedAnswer[] {
  if (!Array.isArray(value)) return []
  const answers: SavedAnswer[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const id = stringOr(item.id, '')
    const question = stringOr(item.question, '')
    const answer = stringOr(item.answer, '')
    const savedAt = typeof item.savedAt === 'number' && Number.isFinite(item.savedAt) ? item.savedAt : null
    const host = stringOr(item.host, '')
    if (!id || !question || !answer || savedAt === null) continue
    answers.push({ id, question, answer, savedAt, host })
  }
  return answers.slice(-ANSWER_CAP)
}

function parseHosts(value: unknown): Record<HostKey, boolean> {
  const defaults = emptyMemory().enabledHosts
  if (!isRecord(value)) return defaults
  return {
    greenhouse: boolOr(value.greenhouse, defaults.greenhouse),
    lever: boolOr(value.lever, defaults.lever),
    demo: boolOr(value.demo, defaults.demo),
  }
}

function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, NAME_CAP)
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return slug || 'personality'
}

function uniquePersonalityId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base
  let suffix = 2
  while (taken.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`.slice(0, 48)
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
