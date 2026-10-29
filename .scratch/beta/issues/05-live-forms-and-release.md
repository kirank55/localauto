# 05: Fill live Greenhouse and Lever forms, and ship the beta

**What to build:** The beta fills the forms on the live sites, not only the demo copies. Greenhouse's react-select dropdowns are picked, reviewed, and reused. Lever's checkbox questions keep their question and are checked on reuse. Labels drop required stars, (Optional) tags, and dropdown text. Radios and checkboxes are clicked so React pages keep them. The side panel keeps results with their page, refuses a stale Accept, adds itself to tabs that were open before install, and folds a saved profile. Settings lists and deletes saved answers. The release is a zip with a privacy policy and store copy.

**Blocked by:** 01, 02, 03, 04

**Status:** done

Found by filling, never submitting, `job-boards.greenhouse.io/anthropic`, `jobs.lever.co/leverdemo`, and `jobs.ashbyhq.com/ashby` with the built extension. The demo's Lever page now uses Lever's markup, and the Greenhouse page has a dropdown built like Greenhouse's, so the tests see what the sites serve. See ADR 0006 and ADR 0007.

- [x] A Greenhouse dropdown answer is collected from the option on show, and an exact saved answer picks that option through the page script.
- [x] A dropdown the page script cannot reach is reported as not filled, and nothing is typed into it.
- [x] A Lever yes/no checkbox card saves its question, refills by exact reuse, and takes a suggestion from a radio question.
- [x] A checkbox answer whose choices contain commas checks the right boxes. An answer that is not a choice checks nothing.
- [x] Questions are stored without a required star, an (Optional) tag, or Lever's location dropdown text.
- [x] Radios and checkboxes are changed by click.
- [x] "Current company" is not suggested for "Current location".
- [x] Accept does nothing when the field with that id asks a different question.
- [x] Results clear when their tab moves to another page and stay when the person switches tabs.
- [x] Fill works in a tab that was open before install.
- [x] Settings deletes one saved answer, or all after a confirm. The side panel does not bring a deleted answer back.
- [x] `npm run zip` builds a versioned beta zip. PRIVACY.md and docs/store-listing.md are written.
