import { describe, expect, test } from 'vitest'
import { classifyHost, HOST_MATCHES, hostLabel, isHostEnabled } from '../hosts'

const allOn = { greenhouse: true, lever: true, demo: true }

describe('application hosts', () => {
  test('groups Greenhouse, Lever, and the local demo, and accepts every other website', () => {
    expect(classifyHost('boards.greenhouse.io')).toBe('greenhouse')
    expect(classifyHost('job-boards.greenhouse.io')).toBe('greenhouse')
    expect(classifyHost('jobs.lever.co')).toBe('lever')
    expect(classifyHost('localhost')).toBe('demo')
    expect(classifyHost('127.0.0.1')).toBe('demo')
    expect(classifyHost('::1')).toBe('demo')
    expect(classifyHost('JOBS.ASHBYHQ.COM.')).toBe('jobs.ashbyhq.com')
    expect(classifyHost('www.greenhouse.io')).toBe('www.greenhouse.io')
    expect(classifyHost('company.greenhouse.io')).toBe('company.greenhouse.io')
    expect(classifyHost('lever.co')).toBe('lever.co')
    expect(classifyHost('jobs.eu.lever.co')).toBe('jobs.eu.lever.co')
    expect(classifyHost('not a host')).toBeNull()
    expect(classifyHost('https://jobs.ashbyhq.com/job')).toBeNull()
    expect(classifyHost('')).toBeNull()
  })

  test('a paused group stays paused and every other website still runs', () => {
    const paused = { greenhouse: false, lever: true, demo: true }
    expect(isHostEnabled(paused, 'boards.greenhouse.io')).toBe(false)
    expect(isHostEnabled(paused, 'www.greenhouse.io')).toBe(true)
    expect(isHostEnabled(allOn, 'jobs.ashbyhq.com')).toBe(true)
    expect(isHostEnabled(allOn, 'not a host')).toBe(false)
    expect(hostLabel('jobs.ashbyhq.com')).toBe('jobs.ashbyhq.com')
    expect(hostLabel('greenhouse')).toBe('Greenhouse')
  })

  test('match patterns cover every http and https website', () => {
    expect([...HOST_MATCHES]).toEqual(['https://*/*', 'http://*/*'])
  })
})
