import type { Browser } from 'wxt/browser'
import { classifyHost, hostLabel } from '../../src/packages/form-memory/hosts'
import { isExtensionRequest, readFrameResult, type FrameResult } from '../../src/packages/form-memory/messages'

type PanelRequest =
  | { type: 'localauto:fill' }
  | { type: 'localauto:accept'; fieldId: string; value: string; frameId: number }
  | { type: 'localauto:collect' }

const QUIET_MS = 400
const MAX_MS = 3000

export function applicationHeading(tab: { title?: string; url?: string } | null | undefined): { title: string; host: string } {
  if (!tab?.url) return { title: 'No application tab yet', host: '' }
  let host = ''
  try {
    const key = classifyHost(new URL(tab.url).hostname)
    if (key) host = hostLabel(key)
  } catch {
    host = ''
  }
  return { title: tab.title?.trim() || 'Application', host }
}

export async function findApplicationTab(): Promise<Browser.tabs.Tab | null> {
  const tabs = await browser.tabs.query({ currentWindow: true })
  const applications = tabs.filter((tab) => {
    if (tab.id === undefined || !tab.url) return false
    try {
      return classifyHost(new URL(tab.url).hostname) !== null
    } catch {
      return false
    }
  })
  return applications.find((tab) => tab.active) ?? applications[0] ?? null
}

export async function requestFrames(tabId: number, message: PanelRequest): Promise<FrameResult[]> {
  const requestId = crypto.randomUUID()
  const payload = { ...message, requestId }
  if (!isExtensionRequest(payload)) return []

  const results: FrameResult[] = []
  await new Promise<void>((resolve) => {
    let settled = false
    let quietTimer: ReturnType<typeof setTimeout> | undefined
    const maxTimer = setTimeout(finish, MAX_MS)

    function finish(): void {
      if (settled) return
      settled = true
      if (quietTimer) clearTimeout(quietTimer)
      clearTimeout(maxTimer)
      browser.runtime.onMessage.removeListener(onMessage)
      resolve()
    }

    function armQuiet(): void {
      if (settled) return
      if (quietTimer) clearTimeout(quietTimer)
      quietTimer = setTimeout(finish, QUIET_MS)
    }

    function onMessage(incoming: unknown, sender: Browser.runtime.MessageSender): void {
      const parsed = readFrameResult(incoming)
      if (!parsed || parsed.requestId !== requestId) return
      if (sender.tab?.id !== undefined && sender.tab.id !== tabId) return
      results.push(parsed)
      armQuiet()
    }

    browser.runtime.onMessage.addListener(onMessage)
    // The content script answers with its own message after reading storage.
    // sendMessage resolves as soon as the listener returns, which is before that reply.
    void browser.tabs.sendMessage(tabId, payload).catch(() => undefined)
  })

  return results
}
