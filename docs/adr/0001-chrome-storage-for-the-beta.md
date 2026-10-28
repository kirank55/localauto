# chrome.storage.local holds the beta, not Dexie

The stack note in PLAN.md names Dexie, and IndexedDB is the right home once answer history needs embeddings. For the beta the profile and a few hundred saved answers fit in `chrome.storage.local`, which stays on the extension origin and which a content script can read without a service-worker database. Dexie can wait until that store is actually too small.
