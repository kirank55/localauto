import { describe, expect, test } from 'vitest'
import {
  addPersonality,
  createMemoryStore,
  emptyMemory,
  emptyProfile,
  PERSONALITY_LIMIT,
  rememberAnswers,
  replacesSavedAnswer,
  removePersonality,
  selectPersonality,
  writeActiveProfile,
  type SavedAnswer,
} from '../memory'

describe('memory store', () => {
  test('starts on Default and keeps Personal, Work, and Software engineer', () => {
    const state = emptyMemory()
    expect(state.activePersonalityId).toBe('default')
    expect(state.personalities.map((personality) => personality.name)).toEqual([
      'Default',
      'Personal',
      'Work',
      'Software engineer',
    ])
    expect(state.listenForSubmit).toBe(true)
  })

  test('round-trips personalities, answers, a paused host, and the submit listener', async () => {
    const saved: { value: unknown } = { value: undefined }
    const store = createMemoryStore({
      async read() {
        return saved.value
      },
      async write(value) {
        saved.value = value
      },
    })
    const state = selectPersonality(emptyMemory(), 'work')
    const withProfile = writeActiveProfile(state, {
      ...emptyProfile(),
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
    })
    await store.save({
      ...withProfile,
      answers: [{ id: 'a', question: 'Why?', answer: 'Because.', savedAt: 3, host: 'jobs.lever.co' }],
      enabledHosts: { greenhouse: true, lever: false, demo: true },
      listenForSubmit: false,
    })
    await expect(store.load()).resolves.toEqual({
      ...withProfile,
      answers: [{ id: 'a', question: 'Why?', answer: 'Because.', savedAt: 3, host: 'jobs.lever.co' }],
      enabledHosts: { greenhouse: true, lever: false, demo: true },
      listenForSubmit: false,
    })
  })

  test('an older profile becomes the Default personality', async () => {
    const store = createMemoryStore({
      async read() {
        return {
          profile: {
            fullName: 'Ada Lovelace',
            email: 'ada@example.com',
            phone: '',
            linkedin: '',
            github: '',
            website: '',
          },
          answers: [],
          enabledHosts: { greenhouse: true, lever: true, demo: true },
        }
      },
      async write() {
        throw new Error('unused')
      },
    })
    const loaded = await store.load()
    expect(loaded.activePersonalityId).toBe('default')
    expect(loaded.personalities.find((personality) => personality.id === 'default')?.profile).toMatchObject({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
    })
    expect(loaded.personalities.map((personality) => personality.id)).toEqual([
      'default',
      'personal',
      'work',
      'software-engineer',
    ])
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

  test('a removed preset stays removed', async () => {
    const saved: { value: unknown } = { value: undefined }
    const store = createMemoryStore({
      async read() {
        return saved.value
      },
      async write(value) {
        saved.value = value
      },
    })
    await store.save(removePersonality(emptyMemory(), 'work'))
    const loaded = await store.load()
    expect(loaded.personalities.some((personality) => personality.id === 'work')).toBe(false)
    expect(loaded.activePersonalityId).toBe('default')
  })
})

describe('personalities', () => {
  test('selects an existing name, writes only the active profile, and keeps Default', () => {
    const selected = addPersonality(emptyMemory(), 'work')
    expect(selected.activePersonalityId).toBe('work')
    expect(selected.personalities).toHaveLength(4)

    const written = writeActiveProfile(selected, { ...emptyProfile(), email: 'ada@work.example' })
    expect(written.personalities.find((personality) => personality.id === 'work')?.profile.email).toBe('ada@work.example')
    expect(written.personalities.find((personality) => personality.id === 'default')?.profile.email).toBe('')

    const removed = removePersonality(written, 'work')
    expect(removed.activePersonalityId).toBe('default')
    expect(removed.personalities.some((personality) => personality.id === 'work')).toBe(false)
    expect(removePersonality(removed, 'default')).toBe(removed)
  })

  test('adds a custom personality and stops at the limit', () => {
    const added = addPersonality(emptyMemory(), 'Campus recruiting')
    expect(added.activePersonalityId).toBe('campus-recruiting')
    expect(added.personalities.at(-1)?.name).toBe('Campus recruiting')

    let state = emptyMemory()
    for (let index = 0; index < 20; index += 1) state = addPersonality(state, `Extra ${index}`)
    expect(state.personalities).toHaveLength(PERSONALITY_LIMIT)
    expect(addPersonality(state, 'One more')).toBe(state)
  })
})

describe('replacesSavedAnswer', () => {
  test('a repeated question, aside from case and punctuation, replaces the saved answer', () => {
    const existing: SavedAnswer[] = [
      { id: 'a', question: 'Why do you want this role???', answer: 'Old', savedAt: 1, host: 'jobs.lever.co' },
    ]
    expect(replacesSavedAnswer(existing, 'Why do you want this role?')).toBe(true)
    expect(replacesSavedAnswer(existing, 'How many years of Python experience do you have?')).toBe(false)
    expect(replacesSavedAnswer(existing, '   ')).toBe(false)
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
