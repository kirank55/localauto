import { describe, expect, test } from 'vitest'
import { createMemoryStore, emptyMemory, rememberAnswers, type SavedAnswer } from '../memory'

describe('memory store', () => {
  test('round-trips a profile, answers, and a paused host', async () => {
    const saved: { value: unknown } = { value: undefined }
    const store = createMemoryStore({
      async read() {
        return saved.value
      },
      async write(value) {
        saved.value = value
      },
    })
    await store.save({
      profile: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '555',
        linkedin: 'https://linkedin.com/in/ada',
        github: '',
        website: '',
      },
      answers: [{ id: 'a', question: 'Why?', answer: 'Because.', savedAt: 3, host: 'jobs.lever.co' }],
      enabledHosts: { greenhouse: true, lever: false, demo: true },
    })
    await expect(store.load()).resolves.toEqual({
      profile: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '555',
        linkedin: 'https://linkedin.com/in/ada',
        github: '',
        website: '',
      },
      answers: [{ id: 'a', question: 'Why?', answer: 'Because.', savedAt: 3, host: 'jobs.lever.co' }],
      enabledHosts: { greenhouse: true, lever: false, demo: true },
    })
  })

  test('garbage in storage loads as empty memory', async () => {
    const store = createMemoryStore({
      async read() {
        return { profile: { email: 12 }, answers: [{ question: 'Nope' }, 'bad'], enabledHosts: { demo: 'yes' } }
      },
      async write() {
        throw new Error('unused')
      },
    })
    await expect(store.load()).resolves.toEqual(emptyMemory())
  })
})

describe('rememberAnswers', () => {
  test('replaces the same question, keeps its id, and drops the oldest past 300', () => {
    const existing: SavedAnswer[] = Array.from({ length: 300 }, (_, index) => ({
      id: `id-${index}`,
      question: `Question ${index}`,
      answer: 'old',
      savedAt: index,
      host: 'jobs.lever.co',
    }))
    const replaced = rememberAnswers(existing, [{ question: 'Question 10?', answer: 'new' }], {
      now: 900,
      host: 'boards.greenhouse.io',
      newId: () => 'should-not-be-used',
    })
    expect(replaced).toHaveLength(300)
    expect(replaced.find((item) => item.id === 'id-10')).toMatchObject({
      answer: 'new',
      savedAt: 900,
      host: 'boards.greenhouse.io',
    })
    expect(replaced[0]?.id).toBe('id-0')

    const capped = rememberAnswers(existing, [{ question: 'Brand new question', answer: 'yes' }], {
      now: 901,
      host: 'localhost',
      newId: () => 'fresh',
    })
    expect(capped).toHaveLength(300)
    expect(capped.some((item) => item.id === 'id-0')).toBe(false)
    expect(capped.at(-1)).toMatchObject({ id: 'fresh', answer: 'yes' })
  })

  test('ignores a blank question or answer', () => {
    expect(rememberAnswers([], [{ question: '  ', answer: 'Yes' }], { now: 1, host: 'x', newId: () => 'a' })).toEqual([])
  })
})
