import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { emptyMemory, emptyProfile, type MemoryState, type Profile, type SavedAnswer } from '../memory'

export const ada: Profile = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '555-010-2030',
  linkedin: 'https://linkedin.com/in/ada',
  github: 'https://github.com/ada',
  website: 'https://ada.example',
}

export function memory(partial: {
  profile?: Partial<Profile>
  answers?: SavedAnswer[]
  enabledHosts?: Partial<MemoryState['enabledHosts']>
  listenForSubmit?: boolean
} = {}): MemoryState {
  const base = emptyMemory()
  const profile = { ...emptyProfile(), ...partial.profile }
  return {
    ...base,
    personalities: base.personalities.map((personality) =>
      personality.id === 'default' ? { ...personality, profile } : personality,
    ),
    answers: partial.answers ?? [],
    enabledHosts: { ...base.enabledHosts, ...partial.enabledHosts },
    listenForSubmit: partial.listenForSubmit ?? base.listenForSubmit,
  }
}

export function saved(question: string, answer: string, savedAt = 1, id = question): SavedAnswer {
  return { id, question, answer, savedAt, host: 'example.test' }
}

export function mount(html: string): Document {
  document.open()
  document.write(html)
  document.close()
  return document
}

export function loadDemo(name: string): Document {
  const html = readFileSync(join(process.cwd(), 'demo', name), 'utf8')
  return mount(html)
}

export function textField(doc: Document, id: string): HTMLInputElement | HTMLTextAreaElement {
  const element = doc.getElementById(id)
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return element
  throw new Error(`missing field ${id}`)
}

export function radioValue(doc: Document, name: string): string {
  const selected = [...doc.querySelectorAll<HTMLInputElement>('input[type="radio"]')].find(
    (input) => input.name === name && input.checked,
  )
  return selected?.value ?? ''
}
