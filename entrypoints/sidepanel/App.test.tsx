import { render } from 'preact'
import { afterEach, expect, test, vi } from 'vitest'
import { MEMORY_STORAGE_KEY } from '../../src/packages/form-memory/chrome-memory'
import { emptyMemory, type MemoryState } from '../../src/packages/form-memory/memory'
import { App } from './App'
import { applicationHeading, findApplicationTab, requestFrames } from './frames'

vi.mock('./frames', async () => {
  const actual = await vi.importActual<typeof import('./frames')>('./frames')
  return {
    ...actual,
    findApplicationTab: vi.fn(),
    requestFrames: vi.fn(),
  }
})

const listeners = new Set<(changes: Record<string, { newValue?: unknown }>, area: string) => void>()
let stored: MemoryState
let container: HTMLElement | undefined

function installBrowser(): void {
  vi.stubGlobal('browser', {
    runtime: {
      async openOptionsPage() {},
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
