import { createChromeMemoryStore, MEMORY_STORAGE_KEY } from '../src/packages/form-memory/chrome-memory'
import { acceptSuggestion, collectSaveCandidates, fillDocument } from '../src/packages/form-memory'
import { classifyHost, HOST_MATCHES } from '../src/packages/form-memory/hosts'
import { isExtensionRequest, type ExtensionRequest } from '../src/packages/form-memory/messages'
import { parseMemoryState, type MemoryState } from '../src/packages/form-memory/memory'
import { profileFromForm } from '../src/packages/form-memory/submit'

const host = classifyHost(location.hostname)
let listening = true
let enabled = true

export default defineContentScript({
  matches: [...HOST_MATCHES],
  allFrames: true,
  runAt: 'document_idle',
  main() {
    if (host) {
      void createChromeMemoryStore().load().then(rememberGate).catch(() => undefined)
      browser.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !(MEMORY_STORAGE_KEY in changes)) return
        rememberGate(parseMemoryState(changes[MEMORY_STORAGE_KEY]?.newValue))
      })
      document.addEventListener('submit', onSubmit, true)
    }
    browser.runtime.onMessage.addListener((message: unknown, sender) => {
      if (!isExtensionRequest(message)) return undefined
      const frameId = sender.frameId ?? 0
      if (message.type === 'localauto:accept' && message.frameId !== frameId) return undefined
      void reply(message, frameId)
      return undefined
    })
  },
})

function rememberGate(state: MemoryState): void {
  listening = state.listenForSubmit
  enabled = host ? state.enabledHosts[host] : false
}

function onSubmit(event: Event): void {
  const form = event.target
  if (!(form instanceof HTMLFormElement) || !host || !listening || !enabled) return
  const profile = profileFromForm(form)
  if (Object.keys(profile).length === 0) return
  void browser.runtime
    .sendMessage({ type: 'localauto:submitted-profile', profile, title: document.title, href: location.href })
    .catch(() => undefined)
}

async function reply(message: ExtensionRequest, frameId: number): Promise<void> {
  const body = await run(message)
  await browser.runtime.sendMessage({ type: 'localauto:frame', requestId: message.requestId, frameId, ...body }).catch(() => undefined)
}

async function run(message: ExtensionRequest): Promise<
  | { kind: 'fill'; outcome: ReturnType<typeof fillDocument> }
  | { kind: 'accept'; applied: boolean }
  | { kind: 'collect'; candidates: ReturnType<typeof collectSaveCandidates> }
> {
  if (message.type === 'localauto:accept') {
    return { kind: 'accept', applied: acceptSuggestion(document, message.fieldId, message.value) }
  }
  if (message.type === 'localauto:collect') {
    return { kind: 'collect', candidates: collectSaveCandidates(document) }
  }
  const state = await createChromeMemoryStore().load()
  return { kind: 'fill', outcome: fillDocument(document, state, location.hostname) }
}
