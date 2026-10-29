import preact from '@preact/preset-vite'
import { defineConfig } from 'wxt'
import { HOST_MATCHES } from './src/packages/form-memory/hosts'

export default defineConfig({
  manifest: {
    name: 'Localauto',
    description: 'Fills application forms on your device from your profile and answers you confirm.',
    permissions: ['storage', 'sidePanel', 'activeTab'],
    host_permissions: [...HOST_MATCHES],
    action: {
      default_title: 'Open Localauto',
    },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
  },
  vite: () => ({
    plugins: [preact()],
  }),
  webExt: {
    disabled: process.env.LOCALAUTO_TRY === '1',
  },
})
