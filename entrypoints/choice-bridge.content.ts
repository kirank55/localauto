import { HOST_MATCHES } from '../src/packages/form-memory/hosts'
import { installChoiceBridge } from '../src/packages/form-memory/page-bridge'

const INSTALLED = Symbol.for('localauto.choice-bridge')

// Runs in the page's main world so the content script can pick react-select options. It holds no saved data.
export default defineContentScript({
  matches: [...HOST_MATCHES],
  allFrames: true,
  runAt: 'document_idle',
  world: 'MAIN',
  main() {
    const scope = globalThis as unknown as Record<symbol, boolean>
    if (scope[INSTALLED]) return
    scope[INSTALLED] = true
    installChoiceBridge(document)
  },
})
