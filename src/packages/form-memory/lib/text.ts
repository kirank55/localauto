/** Lowercase, strip accents and punctuation, and expand dotted country abbreviations. */
export function canonicalize(input: string): string {
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

export function sameQuestion(left: string, right: string): boolean {
  const a = canonicalize(left)
  const b = canonicalize(right)
  return a.length > 0 && a === b
}

export function hasPhrase(haystack: string, phrase: string): boolean {
  return ` ${haystack} `.includes(` ${phrase} `)
}

export function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/** Label text without the required star or an (Optional) / (Required) tag, so the stored question reads cleanly. */
export function cleanQuestion(value: string): string {
  return cleanText(value)
    .replace(/^\((?:optional|required)\)\s*/i, '')
    .replace(/\s*\((?:optional|required)\)$/i, '')
    .replace(/[\s*✱]+$/u, '')
    .replace(/^[*✱]+\s*/u, '')
    .trim()
}

const YES = new Set(['yes', 'y', 'true'])
const NO = new Set(['no', 'n', 'false'])

export function yesNoValue(value: string): boolean | null {
  const canonical = canonicalize(value)
  if (YES.has(canonical)) return true
  if (NO.has(canonical)) return false
  return null
}
