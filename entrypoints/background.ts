import { createChromeSubmitOffer } from '../src/packages/form-memory/chrome-submit'
import { readSubmittedProfileMessage } from '../src/packages/form-memory/submit'

export default defineBackground(() => {
  void browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined)
  void browser.storage.local.remove('localauto-submit').catch(() => undefined)

  browser.runtime.onMessage.addListener((message, sender) => {
    const submitted = readSubmittedProfileMessage(message)
    if (!submitted) return undefined
    const tabId = sender.tab?.id
    const windowId = sender.tab?.windowId
    try {
      if (tabId != null) void browser.sidePanel.open({ tabId })
      else if (windowId != null) void browser.sidePanel.open({ windowId })
    } catch {
      // The submit click has to reach this turn. The stored offer still fills the panel the next time it opens.
    }
    void createChromeSubmitOffer()
      .save({
        heardAt: Date.now(),
        title: submitted.title,
        href: submitted.href,
        tabId: tabId ?? null,
        windowId: windowId ?? null,
        profile: submitted.profile,
      })
      .catch(() => undefined)
    return undefined
  })
})
