import { createMemoryStore, type MemoryStore } from './memory'

const STORAGE_KEY = 'localauto'

export function createChromeMemoryStore(): MemoryStore {
  return createMemoryStore({
    async read() {
      const stored = await browser.storage.local.get(STORAGE_KEY)
      return stored[STORAGE_KEY]
    },
    async write(value) {
      await browser.storage.local.set({ [STORAGE_KEY]: value })
    },
  })
}
