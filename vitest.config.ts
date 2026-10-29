import preact from '@preact/preset-vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [preact()],
  test: {
    environment: 'jsdom',
    include: ['src/packages/**/tests/**/*.test.ts', 'entrypoints/**/*.test.tsx', 'website/**/*.test.ts'],
  },
})
