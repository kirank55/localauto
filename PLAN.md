# Local-first form-learning autofill extension

Manifest V3 browser extension that fills job-application forms from a profile and from answers you have already submitted. Data stays on the device. Paraphrase reuse is the product bet. It is deferred until exact reuse works.

## Positioning

A local-only tool that learns from your own submissions is the product shape.

Public descriptions of the closest tools stop at exact or per-site reuse. They do not show reuse when a question is paraphrased. That cross-wording reuse, without a cloud account, is the wedge to verify before treating it as settled.

The surrounding category is already occupied:

- [job-autofill-tracker](https://github.com/NesDevr/job-autofill-tracker) is a local-first MV3 extension on WXT and Dexie. Profile fields live in `chrome.storage.local`. Answer memory lives in IndexedDB. It click-fills Greenhouse, Lever, Ashby, LinkedIn, Indeed, and Comeet.
- [Loxie](https://loxie.co/docs/integrations/chrome-extension) predicts from a cloud profile, then caches confirmed values per origin on the device.

Confirm neither one retrieves a past answer across paraphrases. If one of them does, the positioning has to move.

## Decisions

### Storage

IndexedDB opened from a content script belongs to the host page. The site can open the same database, and clearing site data deletes it.

The extension database lives on the `chrome-extension://` origin. The service worker owns it. The content script reaches it by message. Open the database on each wake. A service worker can die between `open` and the transaction, and a cached connection then fails.

An offscreen document is the fallback if those transactions start getting killed. That is more likely once vector search exists.

The profile and a few hundred answers fit in `chrome.storage.local`, which content scripts can read directly and which stays private to the extension. Move history to Dexie when it outgrows that, and before embeddings.

### Matching

Fixed profile fields come before fuzzy matching. Email, phone, name, and links are high-precision and cover a large share of real fields.

Match in this order:

1. Input type, autocomplete attribute, and name or id heuristics for profile slots.
2. Exact match on a normalized saved question. These may fill.
3. Fuzzy match only when extracted slots agree. Slots are country, yes/no polarity, and numbers. Show the source question and apply it after the user accepts.
4. Slot conflict never becomes a suggestion. “Authorized to work in the US” and “authorized to work in the UK” are a conflict. “United States” and “US” are the same slot.
5. Embeddings last. The same slot checks still apply. Cosine similarity treats those US and UK questions as neighbors.

### Safety and store review

Fill on a click. Fill only visible fields. Skip hidden, password, and payment fields.

Content scripts match known application hosts, with `all_frames: true`, because those forms often sit in iframes. Optional host permissions are requested from the toolbar or side panel when the user opts a new site in. A content script cannot offer that opt-in on a site where it is not already allowed to run.

Set values through the native input setter and dispatch `input` and `change`. React and similar frameworks ignore a plain `.value` write.

The review list lives in the side panel. The popup is too small to show which past answer is about to be reused.

A static host list plus per-site opt-in was the store-review posture for the first slice. ADR 0005 widens application hosts to every http and https website. `<all_urls>` stays out.

### Learning

Automatic submit detection is unreliable. Many applicant-tracking sites never fire a normal form submit.

The learning loop is a button that saves the questions and answers currently on the page after the user confirms them. Silent capture can come later.

### Stack

WXT, TypeScript, Preact, Dexie. Embeddings are last.

## First slice

Greenhouse and Lever only. Workday is a separate project.

1. Profile fields: name, email, phone, and links. Fill only after a click.
2. Save on purpose: the user confirms the questions they just answered.
3. Exact reuse: a saved answer fills only when the normalized question matches.
4. Fuzzy suggestions: offer a past answer when country, yes/no, and numbers agree.

Out of this slice: embeddings, `<all_urls>`, Workday, LinkedIn Easy Apply, and automatic submit detection.

## Effort

3.5 to 5 weeks is a rough guess for the first slice above, not a sourced estimate. Paraphrase suggestions, submit detection, and Workday are additional work. Add embeddings only after there is a set of real near-miss pairs to test against.
