import { describe, expect, test } from 'vitest'
import { isExtensionRequest, readFrameResult } from '../messages'

describe('frame messages', () => {
  test('accepts a fill request and a frame result', () => {
    expect(isExtensionRequest({ type: 'localauto:fill', requestId: 'r1' })).toBe(true)
    expect(isExtensionRequest({ type: 'localauto:accept', requestId: 'r1', fieldId: 'email', value: 'a' })).toBe(false)
    expect(
      readFrameResult({
        type: 'localauto:frame',
        requestId: 'r1',
        frameId: 2,
        kind: 'fill',
        outcome: { status: 'unsupported' },
      }),
    ).toEqual({
      type: 'localauto:frame',
      requestId: 'r1',
      frameId: 2,
      kind: 'fill',
      outcome: { status: 'unsupported' },
    })
  })

  test('rejects garbage', () => {
    expect(readFrameResult(null)).toBeNull()
    expect(readFrameResult({ type: 'localauto:frame', kind: 'fill' })).toBeNull()
    expect(isExtensionRequest({ type: 'localauto:frame', requestId: 'r1' })).toBe(false)
  })
})
