import { classifyHost } from './hosts'
import { applyField } from './lib/apply'
import { planAndApply } from './lib/plan'
import { matchProfileSlot } from './lib/profile-slot'
import { readFields } from './lib/read-fields'
import type { MemoryState } from './memory'
import type { FillOutcome, FrameFill, MergedFill, SaveCandidate } from './model'

export type {
  AppliedFill,
  FillOutcome,
  FillReport,
  FrameFill,
  MergedFill,
  SaveCandidate,
  SkipReason,
  SkippedField,
  Suggestion,
} from './model'
export { rememberAnswers } from './memory'
export type { MemoryState, Profile, SavedAnswer } from './memory'

export function fillDocument(document: Document, state: MemoryState, hostname: string): FillOutcome {
  const host = classifyHost(hostname)
  if (!host) return { status: 'unsupported' }
  if (!state.enabledHosts[host]) return { status: 'paused', host }
  const planned = planAndApply(readFields(document), state)
  return { status: 'filled', host, report: planned }
}

export function acceptSuggestion(document: Document, fieldId: string, value: string): boolean {
  const field = readFields(document).find((item) => item.id === fieldId)
  if (!field || field.skip) return false
  return applyField(field, value)
}

export function collectSaveCandidates(document: Document): SaveCandidate[] {
  const candidates: SaveCandidate[] = []
  for (const field of readFields(document)) {
    if (field.skip || matchProfileSlot(field)) continue
    if (!field.label || !field.currentValue) continue
    candidates.push({ fieldId: field.id, question: field.label, answer: field.currentValue })
  }
  return candidates
}

export function mergeFrameFills(frames: readonly FrameFill[]): MergedFill {
  const filled = frames.filter((frame) => frame.outcome.status === 'filled')
  if (filled.length === 0) {
    const paused = frames.find((frame) => frame.outcome.status === 'paused')
    if (paused && paused.outcome.status === 'paused') {
      return { status: 'paused', host: paused.outcome.host, applied: [], suggestions: [], skipped: [] }
    }
    return { status: 'unsupported', host: null, applied: [], suggestions: [], skipped: [] }
  }

  const applied = []
  const suggestions = []
  const skipped = []
  let host: MergedFill['host'] = null
  for (const frame of filled) {
    if (frame.outcome.status !== 'filled') continue
    host = frame.outcome.host
    applied.push(...frame.outcome.report.applied)
    skipped.push(...frame.outcome.report.skipped)
    for (const suggestion of frame.outcome.report.suggestions) {
      suggestions.push({ ...suggestion, frameId: frame.frameId })
    }
  }
  return { status: 'filled', host, applied, suggestions, skipped }
}
