import { render } from 'preact'
import { afterEach, expect, test, vi } from 'vitest'
import { MEMORY_STORAGE_KEY } from '../../src/packages/form-memory/chrome-memory'
import { emptyMemory, type MemoryState } from '../../src/packages/form-memory/memory'
import { App } from './App'

let stored: MemoryState

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
      session: {
        async get() {
          return {}
        },
        async set() {},
        async remove() {},
      },
      onChanged: {
        addListener() {},
        removeListener() {},
      },
    },
    runtime: {
      async openOptionsPage() {},
    },
  })
}

function mount(): void {
  const container = document.createElement('div')
  document.body.append(container)
  render(<App />, container)
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

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
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

async function waitForElement(id: string): Promise<HTMLElement> {
  const start = Date.now()
  while (Date.now() - start < 1000) {
    const element = document.getElementById(id)
    if (element) return element
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`${id} did not render`)
}
