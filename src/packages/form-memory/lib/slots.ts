import { canonicalize } from './text'

const PHRASES: readonly (readonly [string, string])[] = [
  ['united states of america', 'US'],
  ['united states', 'US'],
  ['unitedstates', 'US'],
  ['usa', 'US'],
  ['the us', 'US'],
  ['united kingdom', 'UK'],
  ['great britain', 'UK'],
  ['united arab emirates', 'AE'],
  ['new zealand', 'NZ'],
  ['south africa', 'ZA'],
  ['czech republic', 'CZ'],
  ['south korea', 'KR'],
  ['hong kong', 'HK'],
  ['britain', 'UK'],
  ['england', 'UK'],
  ['scotland', 'UK'],
  ['wales', 'UK'],
  ['canada', 'CA'],
  ['australia', 'AU'],
  ['germany', 'DE'],
  ['france', 'FR'],
  ['india', 'IN'],
  ['ireland', 'IE'],
  ['netherlands', 'NL'],
  ['mexico', 'MX'],
  ['brazil', 'BR'],
  ['spain', 'ES'],
  ['italy', 'IT'],
  ['japan', 'JP'],
  ['china', 'CN'],
  ['singapore', 'SG'],
  ['sweden', 'SE'],
  ['norway', 'NO'],
  ['denmark', 'DK'],
  ['finland', 'FI'],
  ['switzerland', 'CH'],
  ['poland', 'PL'],
  ['portugal', 'PT'],
  ['austria', 'AT'],
  ['belgium', 'BE'],
  ['israel', 'IL'],
  ['uae', 'AE'],
  ['uk', 'UK'],
]

const STOP = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'to',
  'of',
  'in',
  'on',
  'for',
  'with',
  'at',
  'by',
  'from',
  'your',
  'you',
  'we',
  'our',
  'please',
  'do',
  'does',
  'did',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'will',
  'would',
  'can',
  'could',
  'should',
  'this',
  'that',
  'it',
  'as',
  'if',
  'any',
  'into',
  'about',
  'over',
  'under',
  'than',
  'then',
  'not',
  'no',
  'yes',
  'how',
  'what',
  'when',
  'where',
  'who',
  'whom',
  'which',
  'many',
  'much',
  // Form modifiers that say which kind of value, not what it is about: "current company" is not "current location".
  'current',
  'currently',
  'desired',
  'preferred',
  'expected',
  'previous',
  'most',
  'recent',
  'please',
  'enter',
  'provide',
  'select',
])

export type Slots = {
  countries: readonly string[]
  numbers: readonly string[]
  yesNo: boolean
}

export function extractSlots(question: string, yesNoControl: boolean): Slots {
  const canonical = canonicalize(question)
  return {
    countries: extractCountries(canonical),
    numbers: extractNumbers(canonical),
    yesNo: yesNoControl || questionIsYesNo(canonical),
  }
}

export function slotsAgree(left: Slots, right: Slots): boolean {
  return sameList(left.countries, right.countries) && sameList(left.numbers, right.numbers) && left.yesNo === right.yesNo
}

export function sharedTokenCount(left: string, right: string): number {
  const tokens = significantTokens(canonicalize(right))
  let count = 0
  for (const token of significantTokens(canonicalize(left))) {
    if (tokens.has(token)) count += 1
  }
  return count
}

function extractCountries(canonical: string): string[] {
  const phrases = [...PHRASES].sort((a, b) => b[0].length - a[0].length)
  let remaining = ` ${canonical} `
  const found = new Set<string>()
  for (const [phrase, code] of phrases) {
    const needle = ` ${phrase} `
    if (!remaining.includes(needle)) continue
    found.add(code)
    remaining = remaining.split(needle).join(' ')
  }
  return [...found].sort()
}

function extractNumbers(canonical: string): string[] {
  const matches = canonical.match(/\d+(?:\.\d+)?/g) ?? []
  const numbers = new Set<string>()
  for (const match of matches) {
    const value = Number(match)
    if (Number.isFinite(value)) numbers.add(String(value))
  }
  return [...numbers].sort((a, b) => Number(a) - Number(b))
}

function questionIsYesNo(canonical: string): boolean {
  return /^(are|do|does|did|is|was|were|have|has|had|will|would|can|could|should)\b/.test(canonical)
}

function significantTokens(canonical: string): Set<string> {
  const tokens = canonical.split(' ').filter((token) => token.length > 2 && !STOP.has(token) && !/^\d/.test(token))
  return new Set(tokens)
}

function sameList(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false
  return left.every((item, index) => item === right[index])
}
