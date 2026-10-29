import { describe, expect, test } from 'vitest'
import { isExtensionRequest, readFrameResult } from '../messages'

describe('frame messages', () => {
  test('accepts a fill request and a frame result', () => {
    expect(isExtensionRequest({ type: 'localauto:fill', requestId: 'r1' })).toBe(true)
    expect(isExtensionRequest({ type: 'localauto:accept', requestId: 'r1', fieldId: 'email', value: 'a' })).toBe(false)
    expect(isExtensionRequest({ type: 'localauto:accept', requestId: 'r1', fieldId: 'email', value: 'a', frameId: 0 })).toBe(false)
    expect(
      isExtensionRequest({ type: 'localauto:accept', requestId: 'r1', fieldId: 'email', value: 'a', question: 'Email', frameId: 0 }),
    ).toBe(true)
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

  test('accepts a fill result from any website and rejects a host that is not one', () => {
    const report = { applied: [], suggestions: [], skipped: [] }
    expect(
      readFrameResult({
        type: 'localauto:frame',
        requestId: 'r1',
        frameId: 0,
        kind: 'fill',
        outcome: { status: 'filled', host: 'jobs.ashbyhq.com', report },
      })?.kind,
    ).toBe('fill')
    expect(
      readFrameResult({
        type: 'localauto:frame',
        requestId: 'r1',
        frameId: 0,
        kind: 'fill',
        outcome: { status: 'filled', host: 'not a host', report },
      }),
    ).toBeNull()
    expect(
      readFrameResult({
        type: 'localauto:frame',
        requestId: 'r1',
        frameId: 0,
        kind: 'fill',
        outcome: { status: 'paused', host: 'boards.greenhouse.io' },
      }),
    ).toBeNull()
  })

  test('rejects garbage', () => {
    expect(readFrameResult(null)).toBeNull()
    expect(readFrameResult({ type: 'localauto:frame', kind: 'fill' })).toBeNull()
    expect(isExtensionRequest({ type: 'localauto:frame', requestId: 'r1' })).toBe(false)
  })
})
