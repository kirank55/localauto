import { render } from 'preact'
import { afterEach, expect, test, vi } from 'vitest'
import { MEMORY_STORAGE_KEY } from '../../src/packages/form-memory/chrome-memory'
import { emptyMemory, type MemoryState } from '../../src/packages/form-memory/memory'
import { App } from './App'
import { applicationHeading, findApplicationTab, pickApplicationTab, requestFrames } from './frames'

vi.mock('./frames', async () => {
  const actual = await vi.importActual<typeof import('./frames')>('./frames')
  return {
    ...actual,
    findApplicationTab: vi.fn(),
    requestFrames: vi.fn(),
  }
})

const listeners = new Set<(changes: Record<string, { newValue?: unknown }>, area: string) => void>()
const tabEvents = {
  activated: new Set<() => void>(),
  updated: new Set<(tabId: number, change: { url?: string }) => void>(),
  removed: new Set<(tabId: number) => void>(),
}

function tabEvent<T extends (...args: never[]) => void>(set: Set<T>) {
  return {
    addListener: (listener: T) => set.add(listener),
    removeListener: (listener: T) => set.delete(listener),
  }
}
let stored: MemoryState
let container: HTMLElement | undefined

function installBrowser(): void {
  vi.stubGlobal('browser', {
    runtime: {
      async openOptionsPage() {},
    },
    tabs: {
      onActivated: tabEvent(tabEvents.activated),
      onUpdated: tabEvent(tabEvents.updated),
      onRemoved: tabEvent(tabEvents.removed),
    },
    storage: {
      local: {
        async get() {
          return { [MEMORY_STORAGE_KEY]: stored }
        },
        async set(items: Record<string, MemoryState>) {
          const next = items[MEMORY_STORAGE_KEY]
          if (next) stored = next
        },
      },
      session: {
        async get() {
          return {}
        },
        async set() {},
        async remove() {},
      },
      onChanged: {
        addListener(listener: (changes: Record<string, { newValue?: unknown }>, area: string) => void) {
          listeners.add(listener)
        },
        removeListener(listener: (changes: Record<string, { newValue?: unknown }>, area: string) => void) {
          listeners.delete(listener)
        },
      },
    },
  })
}

function mount(): void {
  container = document.createElement('div')
  document.body.append(container)
  render(<App />, container)
}

function visibleText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

async function waitForText(id: string, text: string): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < 1000) {
    if (visibleText(document.getElementById(id)?.textContent) === text) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`${id} was "${visibleText(document.getElementById(id)?.textContent)}", expected "${text}"`)
}

async function waitForEnabled(id: string): Promise<HTMLButtonElement> {
  const start = Date.now()
  while (Date.now() - start < 1000) {
    const element = document.getElementById(id)
    if (element instanceof HTMLButtonElement && !element.disabled) return element
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`${id} stayed disabled`)
}

async function waitForPersonality(): Promise<HTMLButtonElement> {
  const start = Date.now()
  while (Date.now() - start < 1000) {
    const button = document.getElementById('personality')
    if (button instanceof HTMLButtonElement && !button.disabled && button.textContent?.includes('Default')) return button
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error('personality button did not become ready')
}

async function waitForElement(id: string): Promise<HTMLElement> {
  const start = Date.now()
  while (Date.now() - start < 1000) {
    const element = document.getElementById(id)
    if (element) return element
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`${id} did not render`)
}

afterEach(() => {
  if (container) render(null, container)
  container = undefined
  listeners.clear()
  for (const set of Object.values(tabEvents)) set.clear()
  document.body.replaceChildren()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

test('application heading uses the tab title and the host', () => {
  expect(applicationHeading(null)).toEqual({ title: 'No application tab yet', host: '' })
  expect(applicationHeading({ title: '  ', url: 'https://jobs.lever.co/acme/job' })).toEqual({
    title: 'Application',
    host: 'Lever',
  })
  expect(applicationHeading({ title: 'Product engineer', url: 'https://boards.greenhouse.io/acme/jobs/1' })).toEqual({
    title: 'Product engineer',
    host: 'Greenhouse',
  })
  expect(applicationHeading({ title: 'Demo', url: 'http://127.0.0.1:4173/greenhouse.html' })).toEqual({
    title: 'Demo',
    host: 'Local demo',
  })
  expect(applicationHeading({ title: 'Demo', url: 'not a url' })).toEqual({ title: 'Demo', host: '' })
  expect(applicationHeading({ title: 'Engineer', url: 'https://jobs.ashbyhq.com/acme/1' })).toEqual({
    title: 'Engineer',
    host: 'jobs.ashbyhq.com',
  })
  expect(applicationHeading({ title: 'Settings', url: 'chrome://settings/' })).toEqual({
    title: 'Settings',
    host: '',
  })
})

test('the application tab is the active website, and the panel page falls back to one', () => {
  const demo = { id: 1, url: 'http://127.0.0.1:4173/greenhouse.html', active: false }
  const panel = { id: 2, url: 'chrome-extension://abc/sidepanel.html', active: true }
  const ashby = { id: 3, url: 'https://jobs.ashbyhq.com/acme/1', active: true }
  const settings = { id: 4, url: 'chrome://settings/', active: true }
  expect(pickApplicationTab([demo, panel])?.id).toBe(1)
  expect(pickApplicationTab([demo, ashby])?.id).toBe(3)
  expect(pickApplicationTab([{ ...ashby, active: false }, settings])).toBeNull()
})

test('the side panel names the open application and says what fill and review do', async () => {
  stored = emptyMemory()
  installBrowser()
  vi.mocked(findApplicationTab).mockResolvedValue({
    id: 4,
    title: 'Product engineer',
    url: 'https://boards.greenhouse.io/acme/jobs/1',
  } as Awaited<ReturnType<typeof findApplicationTab>>)
  mount()

  await waitForText('page-title', 'Product engineer')
  expect(visibleText(document.getElementById('page-host')?.textContent)).toBe('Greenhouse')
  expect(visibleText(document.getElementById('fill-button')?.textContent)).toBe('Fill empty fields')
  expect(document.body.textContent).toContain('Writes your profile and saved answers into blank fields.')
  expect(visibleText(document.getElementById('collect-button')?.textContent)).toBe('Review answers on this form')
  expect(document.body.textContent).toContain('Reads questions you already answered.')
  expect(document.getElementById('collect-button')?.getAttribute('aria-expanded')).toBe('false')
  expect(document.getElementById('save-answers')).toBeNull()
})

test('review lists each answer apart from its question, counts what will be kept, and says when a question is already saved', async () => {
  stored = {
    ...emptyMemory(),
    answers: [
      {
        id: 'why',
        question: 'Why do you want this role???',
        answer: 'Old',
        savedAt: 1,
        host: 'boards.greenhouse.io',
      },
    ],
  }
  installBrowser()
  vi.mocked(findApplicationTab).mockResolvedValue({
    id: 4,
    title: 'Product engineer',
    url: 'https://boards.greenhouse.io/acme/jobs/1',
  } as Awaited<ReturnType<typeof findApplicationTab>>)
  vi.mocked(requestFrames).mockResolvedValue([
    {
      type: 'localauto:frame',
      requestId: 'review',
      frameId: 0,
      kind: 'collect',
      candidates: [
        { fieldId: 'why', question: 'Why do you want this role?', answer: 'Because the work is local.' },
        { fieldId: 'years', question: 'How many years of Python experience do you have?', answer: '5' },
      ],
    },
  ])
  mount()

  const review = await waitForEnabled('collect-button')
  review.click()
  await waitForText('save-answers', 'Keep 2 answers')

  const items = [...document.querySelectorAll('#application .item')]
  expect(items).toHaveLength(2)
  expect(items[0]?.querySelector('.q')?.textContent).toBe('Why do you want this role?')
  expect(items[0]?.querySelector('.answer .value')?.textContent).toBe('Because the work is local.')
  expect(items[0]?.querySelector('.hint')?.textContent).toBe('Replaces the saved answer for this question.')
  expect(items[1]?.querySelector('.q')?.textContent).toBe('How many years of Python experience do you have?')
  expect(items[1]?.querySelector('.answer .value')?.textContent).toBe('5')
  expect(items[1]?.querySelector('.hint')).toBeNull()
  expect(visibleText(document.getElementById('keep-count')?.textContent)).toBe(
    '2 of 2 will be kept. Every personality uses them.',
  )
  expect(document.body.textContent).toContain('Name, email, phone, and links stay on the profile.')
  expect(document.getElementById('collect-button')?.getAttribute('aria-expanded')).toBe('true')

  const leaveOut = items[1]?.querySelector('input')
  if (!(leaveOut instanceof HTMLInputElement)) throw new Error('missing Keep checkbox')
  leaveOut.click()

  await waitForText('save-answers', 'Keep 1 answer')
  expect(visibleText(document.getElementById('keep-count')?.textContent)).toBe(
    '1 of 2 will be kept. Every personality uses them.',
  )
})

test('personality is a compact button on the profile, and the menu stays closed', async () => {
  stored = emptyMemory()
  installBrowser()
  mount()
  const button = await waitForPersonality()

  expect([...document.querySelectorAll('h2')].map((heading) => heading.textContent)).not.toContain('Personality')
  expect(button.classList.contains('secondary')).toBe(true)
  expect(button.getAttribute('aria-expanded')).toBe('false')
  expect(button.closest('section')?.querySelector('h2')?.textContent).toBe('Profile')
  expect(document.getElementById('personality-menu')).toBeNull()
  expect(document.getElementById('create-profile')).toBeNull()

  button.click()
  const menu = await waitForElement('personality-menu')
  expect(menu.querySelectorAll('[role="option"]').length).toBe(stored.personalities.length)
  expect(document.getElementById('create-profile')).toBeInstanceOf(HTMLButtonElement)
})

const ada = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '555-010-2030',
  linkedin: '',
  github: '',
  website: '',
}

function savedProfile(): MemoryState {
  const base = emptyMemory()
  return {
    ...base,
    personalities: base.personalities.map((personality) =>
      personality.id === 'default' ? { ...personality, profile: { ...ada } } : personality,
    ),
  }
}

async function until<T>(read: () => T | null | undefined | false): Promise<T> {
  const start = Date.now()
  while (Date.now() - start < 1000) {
    const value = read()
    if (value) return value
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error('condition was not met')
}

test('a saved profile shows as a summary so Fill stays in reach, and Edit profile opens the form', async () => {
  stored = savedProfile()
  installBrowser()
  mount()

  const edit = await waitForEnabled('edit-profile')
  expect(document.getElementById('profile-fullName')).toBeNull()
  expect(document.getElementById('profile-summary')?.textContent).toContain('Ada Lovelace')
  expect(document.getElementById('profile-summary')?.textContent).toContain('ada@example.com')
  expect(document.getElementById('profile-summary')?.textContent).not.toContain('GitHub')

  edit.click()
  const name = await until(() => document.getElementById('profile-fullName'))
  expect(name).toBeInstanceOf(HTMLInputElement)
})

test('an empty profile opens on the form', async () => {
  stored = emptyMemory()
  installBrowser()
  mount()
  await waitForPersonality()
  expect(document.getElementById('profile-fullName')).toBeInstanceOf(HTMLInputElement)
  expect(document.getElementById('edit-profile')).toBeNull()
})

function fillWithSuggestion(): void {
  vi.mocked(requestFrames).mockResolvedValue([
    {
      type: 'localauto:frame',
      requestId: 'fill',
      frameId: 0,
      kind: 'fill',
      outcome: {
        status: 'filled',
        host: 'greenhouse',
        report: {
          applied: [],
          skipped: [],
          suggestions: [
            {
              fieldId: 'python',
              label: 'Years of Python experience',
              value: '5',
              sourceQuestion: 'How many years of Python experience do you have?',
              savedAnswerId: 'years',
            },
          ],
        },
      },
    },
  ])
}

const greenhouseTab = { id: 4, title: 'Product engineer', url: 'https://boards.greenhouse.io/acme/jobs/1' }

test('suggestions are dropped when their tab moves to another page', async () => {
  stored = savedProfile()
  installBrowser()
  vi.mocked(findApplicationTab).mockResolvedValue(greenhouseTab as Awaited<ReturnType<typeof findApplicationTab>>)
  fillWithSuggestion()
  mount()
  ;(await waitForEnabled('fill-button')).click()
  await until(() => document.getElementById('accept-0'))

  for (const listener of tabEvents.updated) listener(4, { url: 'https://boards.greenhouse.io/acme/jobs/1#app' })
  await new Promise((resolve) => setTimeout(resolve, 20))
  expect(document.getElementById('accept-0')).not.toBeNull()

  for (const listener of tabEvents.updated) listener(4, { url: 'https://boards.greenhouse.io/acme/jobs/2' })
  await until(() => document.getElementById('accept-0') === null)
})

test('switching tabs keeps the results, says where they came from, and Accept still goes to that tab', async () => {
  stored = savedProfile()
  installBrowser()
  vi.mocked(findApplicationTab).mockResolvedValue(greenhouseTab as Awaited<ReturnType<typeof findApplicationTab>>)
  fillWithSuggestion()
  mount()
  ;(await waitForEnabled('fill-button')).click()
  const accept = await until(() => document.getElementById('accept-0'))
  expect(document.getElementById('result-source')).toBeNull()

  vi.mocked(findApplicationTab).mockResolvedValue({
    id: 9,
    title: 'Notes',
    url: 'https://notes.example/resume',
  } as Awaited<ReturnType<typeof findApplicationTab>>)
  for (const listener of tabEvents.activated) listener()
  await waitForText('result-source', 'Results below are from Product engineer, in another tab.')

  vi.mocked(requestFrames).mockResolvedValue([
    { type: 'localauto:frame', requestId: 'accept', frameId: 0, kind: 'accept', applied: true },
  ])
  accept.click()
  await waitForText('notice', 'Suggestion applied.')
  expect(vi.mocked(requestFrames).mock.lastCall?.[0]).toBe(4)
  expect(vi.mocked(requestFrames).mock.lastCall?.[1]).toMatchObject({
    type: 'localauto:accept',
    fieldId: 'python',
    question: 'Years of Python experience',
  })
})

test('an answer deleted in Settings stays deleted when the panel saves the profile', async () => {
  stored = {
    ...savedProfile(),
    answers: [{ id: 'why', question: 'Why do you want this role?', answer: 'Old', savedAt: 1, host: 'jobs.lever.co' }],
  }
  installBrowser()
  mount()
  ;(await waitForEnabled('edit-profile')).click()
  const name = await until(() => document.getElementById('profile-fullName'))
  if (!(name instanceof HTMLInputElement)) throw new Error('missing name input')
  name.focus()

  stored = { ...stored, answers: [] }
  for (const listener of listeners) listener({ [MEMORY_STORAGE_KEY]: { newValue: stored } }, 'local')

  name.value = 'Ada King'
  name.dispatchEvent(new Event('input', { bubbles: true }))
  ;(await waitForEnabled('save-profile')).click()

  await until(() => stored.personalities[0]?.profile.fullName === 'Ada King')
  expect(stored.answers).toEqual([])
})

test('reviewing another page replaces the fill results that were on screen', async () => {
  stored = savedProfile()
  installBrowser()
  vi.mocked(findApplicationTab).mockResolvedValue(greenhouseTab as Awaited<ReturnType<typeof findApplicationTab>>)
  fillWithSuggestion()
  mount()
  ;(await waitForEnabled('fill-button')).click()
  await until(() => document.getElementById('accept-0'))

  vi.mocked(findApplicationTab).mockResolvedValue({
    id: 7,
    title: 'Support engineer',
    url: 'https://jobs.lever.co/acme/2/apply',
  } as Awaited<ReturnType<typeof findApplicationTab>>)
  vi.mocked(requestFrames).mockResolvedValue([
    {
      type: 'localauto:frame',
      requestId: 'review',
      frameId: 0,
      kind: 'collect',
      candidates: [{ fieldId: 'why', question: 'Why do you want this role?', answer: 'Local tools.' }],
    },
  ])
  ;(await waitForEnabled('collect-button')).click()
  await waitForText('save-answers', 'Keep 1 answer')
  expect(document.getElementById('accept-0')).toBeNull()
  expect(document.getElementById('suggestions')).toBeNull()
})
