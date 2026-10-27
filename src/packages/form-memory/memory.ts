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

export type SavedAnswer = {
  id: string
  question: string
  answer: string
  savedAt: number
  host: string
}

export type MemoryState = {
  profile: Profile
  answers: SavedAnswer[]
  enabledHosts: Record<HostKey, boolean>
}

export type MemoryPersistence = {
  read(): Promise<unknown>
  write(value: unknown): Promise<void>
}

export type MemoryStore = {
  load(): Promise<MemoryState>
  save(state: MemoryState): Promise<void>
}

const ANSWER_CAP = 300

export function emptyProfile(): Profile {
  return { fullName: '', email: '', phone: '', linkedin: '', github: '', website: '' }
}

export function emptyMemory(): MemoryState {
  return {
    profile: emptyProfile(),
    answers: [],
    enabledHosts: { greenhouse: true, lever: true, demo: true },
  }
}

export function parseMemoryState(raw: unknown): MemoryState {
  if (!isRecord(raw)) return emptyMemory()
  return {
    profile: parseProfile(raw.profile),
    answers: parseAnswers(raw.answers),
    enabledHosts: parseHosts(raw.enabledHosts),
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

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
