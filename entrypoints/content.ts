import { createChromeMemoryStore } from '../src/packages/form-memory/chrome-memory'
import { acceptSuggestion, collectSaveCandidates, fillDocument } from '../src/packages/form-memory'
import { HOST_MATCHES } from '../src/packages/form-memory/hosts'
import { isExtensionRequest, type ExtensionRequest } from '../src/packages/form-memory/messages'

export default defineContentScript({
  matches: [...HOST_MATCHES],
  allFrames: true,
  runAt: 'document_idle',
  main() {
    browser.runtime.onMessage.addListener((message: unknown, sender) => {
      if (!isExtensionRequest(message)) return undefined
      const frameId = sender.frameId ?? 0
      if (message.type === 'localauto:accept' && message.frameId !== frameId) return undefined
      void reply(message, frameId)
      return undefined
    })
  },
})

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
