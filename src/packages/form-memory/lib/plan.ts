import type { MemoryState, SavedAnswer } from '../memory'
import type { SkippedField, Suggestion } from '../model'
import { applyField } from './apply'
import { matchProfileSlot, slotDetail, valueForSlot } from './profile-slot'
import type { ReadField } from './read-fields'
import { extractSlots, sharedTokenCount, slotsAgree } from './slots'
import { sameQuestion, yesNoValue } from './text'

export type PlannedFill = {
  label: string
  value: string
  via: 'profile' | 'exact'
  detail: string
}

export function planAndApply(
  fields: readonly ReadField[],
  state: MemoryState,
): { applied: PlannedFill[]; suggestions: Suggestion[]; skipped: SkippedField[] } {
  const applied: PlannedFill[] = []
  const suggestions: Suggestion[] = []
  const skipped: SkippedField[] = []

  for (const field of fields) {
    const label = field.label || field.name || field.id
    if (field.skip) {
      skipped.push({ label, reason: field.skip })
      continue
    }
    if (field.currentValue) {
      skipped.push({ label, reason: 'already-filled' })
      continue
    }

    const slot = matchProfileSlot(field)
    if (slot) {
      const value = valueForSlot(state.profile, slot)
      if (value && applyField(field, value)) {
        applied.push({ label: field.label || label, value, via: 'profile', detail: slotDetail(slot) })
      }
      continue
    }

    if (!field.label) continue
    const exact = newest(state.answers.filter((answer) => answer.answer.trim() && sameQuestion(answer.question, field.label)))
    if (exact) {
      if (applyField(field, exact.answer)) {
        applied.push({ label: field.label, value: exact.answer, via: 'exact', detail: exact.question })
      } else {
        skipped.push({ label: field.label, reason: 'unusable' })
      }
      continue
    }

    const suggestion = bestSuggestion(field, state.answers)
    if (!suggestion) continue
    suggestions.push({
      fieldId: field.id,
      label: field.label,
      value: suggestion.answer,
      sourceQuestion: suggestion.question,
      savedAnswerId: suggestion.id,
    })
  }

  return { applied, suggestions, skipped }
}

function bestSuggestion(field: ReadField, answers: readonly SavedAnswer[]): SavedAnswer | null {
  const fieldSlots = extractSlots(field.label, looksYesNo(field))
  let best: { answer: SavedAnswer; shared: number } | null = null
  for (const answer of answers) {
    if (!answer.answer.trim() || !answer.question.trim()) continue
    if (sameQuestion(answer.question, field.label)) continue
    const answerSlots = extractSlots(answer.question, false)
    if (!slotsAgree(fieldSlots, answerSlots)) continue
    const shared = sharedTokenCount(field.label, answer.question)
    if (shared < 1) continue
    if (!best || shared > best.shared || (shared === best.shared && answer.savedAt > best.answer.savedAt)) {
      best = { answer, shared }
    }
  }
  return best?.answer ?? null
}

function looksYesNo(field: ReadField): boolean {
  if (field.kind !== 'radio' && field.kind !== 'checkbox') return false
  const pool = field.options.flatMap((option) => [option.label, option.value])
  const hasYes = pool.some((item) => yesNoValue(item) === true)
  const hasNo = pool.some((item) => yesNoValue(item) === false)
  return hasYes && hasNo
}

function newest(answers: SavedAnswer[]): SavedAnswer | null {
  let best: SavedAnswer | null = null
  for (const answer of answers) {
    if (!best || answer.savedAt >= best.savedAt) best = answer
  }
  return best
}
