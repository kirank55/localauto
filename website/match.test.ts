import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createContext, runInContext } from 'node:vm'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { extractSlots, sharedTokenCount, slotsAgree } from '../src/packages/form-memory/lib/slots'
import { canonicalize, sameQuestion } from '../src/packages/form-memory/lib/text'

type Slots = { countries: string[]; numbers: string[]; yesNo: boolean }
type Judgment = {
  kind: string
  savedCanonical: string
  nextCanonical: string
  savedSlots: Slots
  nextSlots: Slots
  shared: string[]
}

const here = dirname(fileURLToPath(import.meta.url))
const sandbox: { LocalautoMatch?: { canonicalize: (value: string) => string; extractSlots: (question: string, yesNo: boolean) => Slots; judge: (saved: string, next: string, yesNo: boolean) => Judgment } } = {}
runInContext(readFileSync(join(here, 'match.js'), 'utf8'), createContext(sandbox))
const match = sandbox.LocalautoMatch
if (!match) throw new Error('website matcher did not load')

function expectedKind(saved: string, next: string, yesNo: boolean): string {
  if (!canonicalize(saved) || !canonicalize(next)) return 'empty'
  if (sameQuestion(saved, next)) return 'exact'
  const agree = slotsAgree(extractSlots(saved, false), extractSlots(next, yesNo))
  const shared = sharedTokenCount(saved, next)
  if (!agree && shared > 0) return 'conflict'
  if (agree && shared > 0) return 'suggestion'
  return 'quiet'
}

const pairs: Array<[string, string, boolean]> = [
  ['', 'Why this role?', false],
  ['   ', 'Why this role?', false],
  ['Why do you want this role?', 'Why do you want this role?!', false],
  ['Where did you study in Montréal?', 'Where did you study in Montreal?', false],
  ['Are you authorized to work in the United States?', 'Are you legally authorised to work in the US?', true],
  ['Are you authorized to work in the United States?', 'Are you authorized to work in the UK?', true],
  ['Tell us about yourself', 'Tell us about your work in the United States', false],
  ['Tell us about your work in the US', 'Tell us about your work in the United States', false],
  ['How many years of Python experience do you have?', 'Years of Python experience', false],
  ['Do you have 5 years of Python experience?', 'Do you have 10 years of Python experience?', false],
  ['Are you willing to relocate?', 'Are you a veteran?', true],
  ['Are you authorized to work in the United States?', 'Work authorization in the United States', true],
  ['Are you authorized to work in the United States?', 'Work authorization in the United States', false],
  ['Are you authorized to work in Scotland?', 'Are you authorized to work in the UK?', true],
  ['Are you authorized to work in Scotland?', 'Are you authorized to work in the United States?', true],
  ['Will you now or in the future require sponsorship?', 'Will you require visa sponsorship?', false],
]

describe('website matcher', () => {
  test('uses the same canonical form, slots, and decision as the extension', () => {
    for (const sample of ['U.S.', 'U.S.A.', 'U.K.', 'Montréal', 'a & b', 'Why do you want this role?!']) {
      expect(match.canonicalize(sample)).toBe(canonicalize(sample))
    }
    for (const [saved, next, yesNo] of pairs) {
      const judged = match.judge(saved, next, yesNo)
      expect(judged.kind, `${saved} -> ${next}`).toBe(expectedKind(saved, next, yesNo))
      expect(judged.savedCanonical).toBe(canonicalize(saved))
      expect(judged.nextCanonical).toBe(canonicalize(next))
      expect(judged.savedSlots).toEqual(extractSlots(saved, false))
      expect(judged.nextSlots).toEqual(extractSlots(next, yesNo))
      expect(judged.shared.length).toBe(canonicalize(saved) && canonicalize(next) ? sharedTokenCount(saved, next) : 0)
    }
  })

  test('does not treat tell us as a country', () => {
    expect(match.extractSlots('Tell us about yourself', false).countries).toEqual([])
    expect(match.extractSlots('authorised to work in the US', false).countries).toEqual(['US'])
    expect(match.extractSlots('authorized to work in Scotland', false).countries).toEqual(['UK'])
  })
})

describe('website copy', () => {
  const page = readFileSync(join(here, 'index.html'), 'utf8')

  test('states the product boundaries in the page', () => {
    expect(page).toContain('Nothing is uploaded')
    expect(page).toContain('There is no account')
    expect(page).toContain('boards.greenhouse.io')
    expect(page).toContain('job-boards.greenhouse.io')
    expect(page).toContain('jobs.lever.co')
    expect(page).toContain('http://localhost/*')
    expect(page).toContain('Fill empty fields')
    expect(page).toContain('Find answers to save')
    expect(page).toContain('300')
  })

  test('does not claim a store listing or a model', () => {
    const lower = page.toLowerCase()
    expect(lower).not.toContain('chrome web store')
    expect(lower).not.toContain('autofill')
    expect(lower).not.toContain('sign up')
    expect(lower).not.toContain('machine learning')
  })
})
