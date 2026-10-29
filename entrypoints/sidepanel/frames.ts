import type { Browser } from 'wxt/browser'
import { classifyHost, hostLabel } from '../../src/packages/form-memory/hosts'
import { isExtensionRequest, readFrameResult, type FrameResult } from '../../src/packages/form-memory/messages'

type PanelRequest =
  | { type: 'localauto:fill' }
  | { type: 'localauto:accept'; fieldId: string; value: string; question: string; frameId: number }
  | { type: 'localauto:collect' }

type ScriptFiles = NonNullable<Parameters<typeof browser.scripting.executeScript>[0]['files']>

const QUIET_MS = 400
const MAX_MS = 3000

type TabLike = { id?: number; url?: string; active?: boolean; title?: string }

export function applicationHeading(tab: { title?: string; url?: string } | null | undefined): { title: string; host: string } {
  if (!tab?.url) return { title: 'No application tab yet', host: '' }
  const key = applicationHost(tab.url)
  return { title: tab.title?.trim() || 'Application', host: key ? hostLabel(key) : '' }
}

export function pickApplicationTab<T extends TabLike>(tabs: readonly T[]): T | null {
  const active = tabs.find((tab) => tab.active)
  if (active && applicationHost(active.url) && active.id !== undefined) return active
  if (active?.url?.startsWith('chrome-extension://')) {
    return tabs.find((tab) => tab.id !== undefined && applicationHost(tab.url) !== null) ?? null
  }
  return null
}

export async function findApplicationTab(): Promise<Browser.tabs.Tab | null> {
  const tabs = await browser.tabs.query({ currentWindow: true })
  return pickApplicationTab(tabs)
}

function applicationHost(url: string | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return classifyHost(parsed.hostname)
  } catch {
    return null
  }
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
    // It rejects at once when no frame in the tab has a listener, so there is nothing to wait for.
    void browser.tabs.sendMessage(tabId, payload).catch((error: unknown) => {
      if (String(error).includes('Receiving end does not exist')) finish()
    })
  })

  return results
}

/**
 * Chrome does not add content scripts to tabs that were open before Localauto was installed or updated.
 * Run the manifest's scripts in that tab so Fill works without a reload. False when the page refuses,
 * as chrome:// pages and the Web Store do.
 */
export async function injectContentScripts(tabId: number): Promise<boolean> {
  try {
    const scripts = browser.runtime.getManifest().content_scripts ?? []
    for (const script of scripts) {
      const files = script.js ?? []
      if (files.length === 0) continue
      const world = (script as { world?: string }).world === 'MAIN' ? 'MAIN' : 'ISOLATED'
      await browser.scripting.executeScript({
        target: { tabId, allFrames: script.all_frames === true },
        files: files as ScriptFiles,
        world,
      })
    }
    return scripts.length > 0
  } catch {
    return false
  }
}
