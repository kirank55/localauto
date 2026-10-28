import { describe, expect, test } from 'vitest'
import { classifyHost, HOST_MATCHES } from '../hosts'

describe('application hosts', () => {
  test('recognizes Greenhouse, Lever, and the local demo only', () => {
    expect(classifyHost('boards.greenhouse.io')).toBe('greenhouse')
    expect(classifyHost('job-boards.greenhouse.io')).toBe('greenhouse')
    expect(classifyHost('jobs.lever.co')).toBe('lever')
    expect(classifyHost('localhost')).toBe('demo')
    expect(classifyHost('127.0.0.1')).toBe('demo')
    expect(classifyHost('www.greenhouse.io')).toBeNull()
    expect(classifyHost('company.greenhouse.io')).toBeNull()
    expect(classifyHost('lever.co')).toBeNull()
    expect(classifyHost('jobs.eu.lever.co')).toBeNull()
  })

  test('match patterns cover the hosts the beta runs on', () => {
    expect([...HOST_MATCHES]).toEqual([
      'https://boards.greenhouse.io/*',
      'https://job-boards.greenhouse.io/*',
      'https://jobs.lever.co/*',
      'http://localhost/*',
      'http://127.0.0.1/*',
    ])
  })
})
