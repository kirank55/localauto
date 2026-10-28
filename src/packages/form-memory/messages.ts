import type { FillOutcome, SaveCandidate } from './model'

export type ExtensionRequest =
  | { type: 'localauto:fill'; requestId: string }
  | { type: 'localauto:accept'; requestId: string; fieldId: string; value: string; frameId: number }
  | { type: 'localauto:collect'; requestId: string }

export type FrameResult =
  | { type: 'localauto:frame'; requestId: string; frameId: number; kind: 'fill'; outcome: FillOutcome }
  | { type: 'localauto:frame'; requestId: string; frameId: number; kind: 'accept'; applied: boolean }
  | { type: 'localauto:frame'; requestId: string; frameId: number; kind: 'collect'; candidates: SaveCandidate[] }

export function isExtensionRequest(value: unknown): value is ExtensionRequest {
  if (!isRecord(value) || typeof value.requestId !== 'string' || !value.requestId) return false
  if (value.type === 'localauto:fill' || value.type === 'localauto:collect') return true
  return (
    value.type === 'localauto:accept' &&
    typeof value.fieldId === 'string' &&
    typeof value.value === 'string' &&
    typeof value.frameId === 'number'
  )
}

export function readFrameResult(value: unknown): FrameResult | null {
  if (!isRecord(value) || value.type !== 'localauto:frame') return null
  if (typeof value.requestId !== 'string' || typeof value.frameId !== 'number') return null
  if (value.kind === 'fill' && isFillOutcome(value.outcome)) {
    return { type: 'localauto:frame', requestId: value.requestId, frameId: value.frameId, kind: 'fill', outcome: value.outcome }
  }
  if (value.kind === 'accept' && typeof value.applied === 'boolean') {
    return { type: 'localauto:frame', requestId: value.requestId, frameId: value.frameId, kind: 'accept', applied: value.applied }
  }
  if (value.kind === 'collect' && Array.isArray(value.candidates) && value.candidates.every(isSaveCandidate)) {
    return {
      type: 'localauto:frame',
      requestId: value.requestId,
      frameId: value.frameId,
      kind: 'collect',
      candidates: value.candidates,
    }
  }
  return null
}

function isFillOutcome(value: unknown): value is FillOutcome {
  if (!isRecord(value)) return false
  if (value.status === 'unsupported') return true
  if (value.status === 'paused') return value.host === 'greenhouse' || value.host === 'lever' || value.host === 'demo'
  if (value.status !== 'filled') return false
  if (value.host !== 'greenhouse' && value.host !== 'lever' && value.host !== 'demo') return false
  if (!isRecord(value.report)) return false
  return Array.isArray(value.report.applied) && Array.isArray(value.report.suggestions) && Array.isArray(value.report.skipped)
}

function isSaveCandidate(value: unknown): value is SaveCandidate {
  return (
    isRecord(value) &&
    typeof value.fieldId === 'string' &&
    typeof value.question === 'string' &&
    typeof value.answer === 'string'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
