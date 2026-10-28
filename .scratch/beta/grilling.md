# Beta grilling

The user was not available. Each question below is a branch that had to be settled before building. The recommended answer was accepted.

**Q1. Is the beta the first slice in PLAN.md?**
Greenhouse and Lever, profile fill on click, confirm-save, exact reuse, and slot-gated suggestions. Embeddings, `<all_urls>`, Workday, LinkedIn Easy Apply, and automatic submit detection stay out.
Yes.

**Q2. Where do the profile and saved answers live?**
`chrome.storage.local`, not Dexie and not a page-origin IndexedDB. See ADR 0001.
Yes.

**Q3. Is answer memory global or per site?**
Global. See ADR 0002.
Yes.

**Q4. What does a suggestion require?**
Slot agreement (country, yes/no, numbers) and at least one shared significant word. One suggestion per question, the one with the most shared words, then the newest. Country aliases such as "US" and "United States" are the same slot. "Tell us" is not the United States. A conflict never becomes a suggestion, and a suggestion never fills until Accept.
Yes. The shared-word rule is stricter than "slots agree" alone so unrelated yes/no questions stay quiet.

**Q5. What is the UI?**
The toolbar opens a side panel. There is no popup. Fill, the review list, suggestions, and confirm-save all live there.
Yes.

**Q6. Which hosts, and how is opt-in expressed?**
Static hosts: `boards.greenhouse.io`, `job-boards.greenhouse.io`, `jobs.lever.co`, plus localhost for the demo. Each can be paused. No arbitrary opt-in and no `<all_urls>`. See ADR 0003.
Yes.

**Q7. Where are the spec and tickets published?**
Local markdown under `.scratch/`, not GitHub Issues. `AGENTS.md` was created because the repo had neither `AGENTS.md` nor `CLAUDE.md`.
Yes.

**Q8. Which seams are tested?**
`fillDocument`, `acceptSuggestion`, `collectSaveCandidates` with `rememberAnswers`, `createMemoryStore`, and `mergeFrameFills`. Chrome wiring is covered by an end-to-end smoke test, not by mocking the extension APIs.
Yes.
