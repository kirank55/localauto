import { createMemoryStore, type MemoryStore } from './memory'

export const MEMORY_STORAGE_KEY = 'localauto'

export function createChromeMemoryStore(): MemoryStore {
  return createMemoryStore({
    async read() {
      const stored = await browser.storage.local.get(MEMORY_STORAGE_KEY)
      return stored[MEMORY_STORAGE_KEY]
    },
    async write(value) {
      await browser.storage.local.set({ [MEMORY_STORAGE_KEY]: value })
    },
  })
}
