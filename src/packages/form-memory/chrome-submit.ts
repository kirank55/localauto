import { parseSubmitOffer, type SubmitOffer } from './submit'

export const SUBMIT_OFFER_KEY = 'localauto-submit-offer'

export type SubmitOfferStore = {
  load(): Promise<SubmitOffer | null>
  save(offer: SubmitOffer): Promise<void>
  clear(): Promise<void>
}

export function createChromeSubmitOffer(): SubmitOfferStore {
  return {
    async load() {
      const stored = await browser.storage.session.get(SUBMIT_OFFER_KEY)
      return parseSubmitOffer(stored[SUBMIT_OFFER_KEY])
    },
    async save(offer) {
      const parsed = parseSubmitOffer(offer)
      if (!parsed) return
      await browser.storage.session.set({ [SUBMIT_OFFER_KEY]: parsed })
    },
    async clear() {
      await browser.storage.session.remove(SUBMIT_OFFER_KEY)
    },
  }
}
