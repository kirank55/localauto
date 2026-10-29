import { render } from 'preact'
import { afterEach, expect, test, vi } from 'vitest'
import { MEMORY_STORAGE_KEY } from '../../src/packages/form-memory/chrome-memory'
import {
  emptyMemory,
  selectPersonality,
  writeActiveProfile,
  type MemoryState,
  type Profile,
} from '../../src/packages/form-memory/memory'
import { App } from './App'

const listeners = new Set<(changes: Record<string, { newValue?: unknown }>, area: string) => void>()
let stored: MemoryState

const filled: Profile = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '555-010-2030',
  linkedin: 'https://linkedin.com/in/ada',
  github: 'https://github.com/ada',
  website: 'https://ada.example',
}

function installBrowser(): void {
  vi.stubGlobal('browser', {
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

function mount(): HTMLElement {
  const container = document.createElement('div')
  document.body.append(container)
  render(<App />, container)
  return container
}

async function waitForText(id: string, text: string): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < 1000) {
    if (document.getElementById(id)?.textContent === text) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`${id} was "${document.getElementById(id)?.textContent ?? ''}", expected "${text}"`)
}

afterEach(() => {
  listeners.clear()
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

test('settings shows the profile saved for the selected personality', async () => {
  stored = writeActiveProfile(emptyMemory(), filled)
  installBrowser()
  mount()

  await waitForText('saved-fullName', 'Ada Lovelace')
  expect(document.getElementById('saved-email')?.textContent).toBe('ada@example.com')
  expect(document.getElementById('saved-phone')?.textContent).toBe('555-010-2030')
  expect(document.getElementById('saved-linkedin')?.textContent).toBe('https://linkedin.com/in/ada')
  expect(document.getElementById('saved-github')?.textContent).toBe('https://github.com/ada')
  expect(document.getElementById('saved-website')?.textContent).toBe('https://ada.example')
  expect(document.getElementById('saved-profile')?.textContent).toContain('Default')
  expect(document.body.textContent).toContain('Runs on any website.')
})

test('settings shows another personality as not saved until that profile has data', async () => {
  stored = writeActiveProfile(emptyMemory(), filled)
  installBrowser()
  mount()
  await waitForText('saved-fullName', 'Ada Lovelace')

  const select = document.getElementById('personality')
  if (!(select instanceof HTMLSelectElement)) throw new Error('personality select missing')
  select.value = 'work'
  select.dispatchEvent(new Event('change', { bubbles: true }))

  await waitForText('saved-fullName', 'Not saved')
  expect(document.getElementById('saved-email')?.textContent).toBe('Not saved')
  expect(document.getElementById('saved-profile')?.textContent).toContain('Work')
})

test('settings updates when a profile is saved on this device', async () => {
  stored = emptyMemory()
  installBrowser()
  mount()
  await waitForText('saved-email', 'Not saved')

  stored = writeActiveProfile(selectPersonality(stored, 'personal'), {
    ...filled,
    fullName: 'Grace Hopper',
    email: 'grace@example.com',
  })
  for (const listener of listeners) {
    listener({ [MEMORY_STORAGE_KEY]: { newValue: stored } }, 'local')
  }

  await waitForText('saved-fullName', 'Grace Hopper')
  expect(document.getElementById('saved-email')?.textContent).toBe('grace@example.com')
  expect(document.getElementById('saved-profile')?.textContent).toContain('Personal')
})
