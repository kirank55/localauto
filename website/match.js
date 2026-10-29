// Mirrors src/packages/form-memory/lib/text.ts and slots.ts so this page
// can show the beta's real checks without a build step.
const PHRASES = [
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

function canonicalize(input) {
  return input
    .toLowerCase()
    .replace(/u\.s\.a\.?/g, ' usa ')
    .replace(/u\.s\.?/g, ' unitedstates ')
    .replace(/u\.k\.?/g, ' uk ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function sameQuestion(left, right) {
  const a = canonicalize(left)
  const b = canonicalize(right)
  return a.length > 0 && a === b
}

function extractCountries(canonical) {
  const phrases = PHRASES.slice().sort((a, b) => b[0].length - a[0].length)
  let remaining = ` ${canonical} `
  const found = new Set()
  for (const [phrase, code] of phrases) {
    const needle = ` ${phrase} `
    if (!remaining.includes(needle)) continue
    found.add(code)
    remaining = remaining.split(needle).join(' ')
  }
  return [...found].sort()
}

function extractNumbers(canonical) {
  const matches = canonical.match(/\d+(?:\.\d+)?/g) ?? []
  const numbers = new Set()
  for (const match of matches) {
    const value = Number(match)
    if (Number.isFinite(value)) numbers.add(String(value))
  }
  return [...numbers].sort((a, b) => Number(a) - Number(b))
}

function questionIsYesNo(canonical) {
  return /^(are|do|does|did|is|was|were|have|has|had|will|would|can|could|should)\b/.test(canonical)
}

function significantTokens(canonical) {
  return new Set(canonical.split(' ').filter((token) => token.length > 2 && !STOP.has(token) && !/^\d/.test(token)))
}

function extractSlots(question, yesNoControl) {
  const canonical = canonicalize(question)
  return {
    countries: extractCountries(canonical),
    numbers: extractNumbers(canonical),
    yesNo: Boolean(yesNoControl) || questionIsYesNo(canonical),
  }
}

function sameList(left, right) {
  if (left.length !== right.length) return false
  return left.every((item, index) => item === right[index])
}

function slotsAgree(left, right) {
  return sameList(left.countries, right.countries) && sameList(left.numbers, right.numbers) && left.yesNo === right.yesNo
}

function sharedTokens(left, right) {
  const tokens = significantTokens(canonicalize(right))
  const shared = []
  for (const token of significantTokens(canonicalize(left))) {
    if (tokens.has(token)) shared.push(token)
  }
  return shared
}

function judge(saved, next, yesNoControl) {
  const savedCanonical = canonicalize(saved)
  const nextCanonical = canonicalize(next)
  const savedSlots = extractSlots(saved, false)
  const nextSlots = extractSlots(next, yesNoControl)
  const shared = savedCanonical && nextCanonical ? sharedTokens(saved, next) : []
  const agree = slotsAgree(savedSlots, nextSlots)
  let kind = 'quiet'
  if (!savedCanonical || !nextCanonical) kind = 'empty'
  else if (sameQuestion(saved, next)) kind = 'exact'
  else if (!agree && shared.length > 0) kind = 'conflict'
  else if (agree && shared.length > 0) kind = 'suggestion'
  return {
    kind,
    agree,
    savedCanonical,
    nextCanonical,
    savedSlots,
    nextSlots,
    shared,
  }
}

this.LocalautoMatch = {
  canonicalize,
  extractSlots,
  judge,
}
