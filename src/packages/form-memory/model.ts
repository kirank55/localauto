import type { HostKey } from './hosts'

export type AppliedFill = {
  label: string
  value: string
  via: 'profile' | 'exact'
  detail: string
}

export type Suggestion = {
  fieldId: string
  label: string
  value: string
  sourceQuestion: string
  savedAnswerId: string
}

export type SkipReason = 'hidden' | 'password' | 'payment' | 'already-filled' | 'unusable'

export type SkippedField = {
  label: string
  reason: SkipReason
}

export type FillReport = {
  applied: AppliedFill[]
  suggestions: Suggestion[]
  skipped: SkippedField[]
}

export type FillOutcome =
  | { status: 'unsupported' }
  | { status: 'paused'; host: HostKey }
  | { status: 'filled'; host: HostKey; report: FillReport }

export type SaveCandidate = {
  fieldId: string
  question: string
  answer: string
}

export type FrameFill = {
  frameId: number
  outcome: FillOutcome
}

export type MergedFill = {
  status: 'unsupported' | 'paused' | 'filled'
  host: HostKey | null
  applied: AppliedFill[]
  suggestions: Array<Suggestion & { frameId: number }>
  skipped: SkippedField[]
}
