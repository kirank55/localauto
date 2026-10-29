# Localauto beta

**Status:** ready-for-agent

This spec is the beta PRD. Source: `PLAN.md` and `.scratch/beta/grilling.md`.

## Problem Statement

Applying to jobs means typing the same name, email, phone, links, and short answers into form after form. The tools that fill those forms either keep a cloud profile or reuse an answer only when the wording is identical and often only on the same site. A person who wants the help without an account has nowhere to put the answers they have already given.

## Solution

Localauto is a Chrome extension. The person keeps a profile and confirms the answers on a page they just filled. The next form, on any website, fills empty visible fields from that profile and from an exact question match. When the wording differs but the country, yes/no, and number slots agree, Localauto shows the past answer and waits for Accept. Nothing leaves the device.

## User Stories

1. As an applicant, I want to save my name, email, phone, and links in the extension, so that I can reuse them without an account.
2. As an applicant, I want the toolbar icon to open a side panel, so that I can review what will be reused.
3. As an applicant, I want a Fill button, so that nothing is written until I ask.
4. As an applicant, I want Greenhouse first and last name fields to split my full name, so that I do not retype them.
5. As an applicant, I want a single name field, like Lever's, to receive my full name, so that the same profile works on both hosts.
6. As an applicant, I want email, phone, LinkedIn, GitHub, and website fields to fill from the profile, so that the high-precision fields are done in one click.
7. As an applicant, I want a one-word name to fill first name and leave last name empty, so that a missing last name is not invented.
8. As an applicant, I want a long question that merely mentions email to stay empty, so that my email is not written into someone else's contact field.
9. As an applicant, I want hidden fields left alone, so that honeypots and off-screen inputs are not touched.
10. As an applicant, I want password fields left alone, so that a credential is never written by the extension.
11. As an applicant, I want payment fields left alone, so that a card number is never filled from my profile.
12. As an applicant, I want fields I already typed to stay as I typed them, so that Fill does not clobber a correction.
13. As an applicant, I want filled text to go through the native value setter and to emit input and change, so that the host page's own form state updates.
14. As an applicant, I want to pause Localauto on Greenhouse, Lever, or the demo, so that a site I do not want touched stays untouched.
15. As an applicant, I want Fill on any website, so that a form outside Greenhouse and Lever still uses my profile and saved answers.
16. As an applicant, I want to review the questions I just answered and choose which to keep, so that learning is deliberate.
17. As an applicant, I want profile fields excluded from that review, so that my email is not stored a second time as a question.
18. As an applicant, I want a saved answer to fill when the next question matches aside from case and punctuation, so that exact reuse works across forms.
19. As an applicant, I want an exact yes/no answer to select the matching option, so that radios and selects are filled too.
20. As an applicant, I want a saved Lever answer to fill the same question on Greenhouse, so that memory is not trapped on one host.
21. As an applicant, I want "authorized to work in the United States" to be offered, not auto-filled, for "authorised to work in the US", so that I can see the source wording.
22. As an applicant, I want that same answer withheld from a UK authorization question, so that a country conflict never becomes a suggestion.
23. As an applicant, I want "tell us" not to be treated as the United States, so that an ordinary sentence is not a country slot.
24. As an applicant, I want a years-of-experience paraphrase offered when neither question states a conflicting number, so that "5" can be reused.
25. As an applicant, I want "5 years" withheld from a question that says "10 years", so that a number conflict never becomes a suggestion.
26. As an applicant, I want an unrelated yes/no question, such as relocation versus veteran status, to stay quiet, so that the review list is not every past answer.
27. As an applicant, I want a sponsorship paraphrase offered and not selected until I accept it, so that a different wording stays a suggestion.
28. As an applicant, I want Accept to check the matching choice, so that a suggestion can still be used.
29. As an applicant, I want a yes/no group recognized even when the legend is not phrased as a question, so that "Work authorization in the United States" can still be suggested.
30. As an applicant, I want the side panel to list what was filled, which past question it came from, and what was skipped, so that I can see the difference between a profile fill, exact reuse, and a suggestion.
31. As an applicant, I want hidden skips counted and password or payment skips named, so that the safety rules are visible.
32. As an applicant, I want a form inside an iframe to fill too, so that embedded Greenhouse boards work.
33. As an applicant, I want storage that survives a bad write to come back as an empty profile, so that corrupt data does not break Fill.
34. As an applicant, I want a repeated question to update the saved answer rather than stack duplicates, so that a correction replaces the old one.
35. As an applicant, I want answer history capped, so that a few hundred answers do not grow without bound.
36. As a developer, I want a local demo of Greenhouse, Lever, a paraphrased second form, and an iframe, so that I can try the beta without an employer account.
37. As an applicant, I want Default selected until I choose another personality, so that Fill uses a profile I recognize.
38. As an applicant, I want Personal, Work, Software engineer, and names I add, so that each keeps its own name, email, phone, and links.
39. As an applicant, I want that choice above the profile form, so that I can see which personality I am about to save.
40. As an applicant, I want a settings page, so that I can add or remove personalities, pause a site, and turn the submit listener on or off.
41. As an applicant, I want a submit to open the side panel with profile details filled in, so that I can press Save profile.

## Implementation Decisions

- The product surface is one deep module: given a document, a profile, and saved answers, fill empty visible fields, list suggestions, accept one, and collect questions worth saving. Chrome is an adapter around that module.
- Manifest V3, WXT, TypeScript, and Preact. The side panel is where a person fills and reviews. A settings page holds personalities, site pauses, and the submit listener. Clicking the toolbar opens the side panel.
- Profile slots are recognized from input type, autocomplete, name, id, and a short label. Order is email, phone, LinkedIn, GitHub, website, first name, last name, full name. A full name splits on the first space. Radios, checkboxes, and selects are never profile slots.
- Exact reuse compares a canonical question: lowercase, accents removed, punctuation collapsed, dotted forms like "U.S." expanded. The newest saved answer wins.
- A suggestion requires equal country sets, equal number sets, the same yes/no-ness, and at least one shared significant word. Countries come from a phrase list. Bare "us" counts only in phrases like "the us", "u.s.", "usa", and "united states". One suggestion per question.
- Fill writes text and selects with the platform value setter and dispatches `input` and `change`. Radios and checkboxes are clicked, so React pages keep the choice. Selects, radios, and checkbox groups match the visible choice. A checkbox group's answer is its checked choices joined by commas. Greenhouse's react-select dropdowns are picked through a page script (ADR 0006). Accept may overwrite. Fill itself does not. Accept checks that the field still asks the question it was offered for.
- Hidden, password, and payment controls are skipped. Disabled and read-only controls are skipped. File, button, and date controls are ignored.
- Any http or https website is an application host. Greenhouse (`boards.greenhouse.io`, `job-boards.greenhouse.io`), Lever (`jobs.lever.co`), and the local demo (`localhost`, `127.0.0.1`) are the pause groups. Content scripts run in all frames on `http://*/*` and `https://*/*`. Frames report their own results so the extension does not request browsing-history permissions. `<all_urls>` stays out.
- The stored shape is a list of personalities (id, name, profile), the selected personality id, a list of saved answers (id, question, answer, time, host), a boolean per pause group, and whether submits offer profile details. Default is selected when an older profile is migrated. Parsing drops malformed entries. Confirm-save replaces a canonical question and keeps at most 300 answers. A pending submit offer lives in session storage until the panel applies it. It is not written into the personality until Save profile.
- A local demo server serves fixture forms that the tests also load.

## Testing Decisions

Good tests exercise the public functions and assert known literals. They do not import `lib/` or mock the matcher.

Seams:

- `fillDocument` catches profile fill, skips, exact reuse, suggestions, pause, any website, and a value that is not a website. It misses Chrome messaging.
- `acceptSuggestion` catches applying a suggestion.
- `collectSaveCandidates` and `rememberAnswers` catch confirm-save, including the cross-form learning loop.
- `createMemoryStore` catches persistence parsing, including an older profile becoming the Default personality. The Chrome adapter is glue.
- `profileFromForm` catches which profile slots a submit offers. Password, payment, and custom questions stay out. A first and last name join into the full name.
- `mergeSubmitOffer` writes only the offered keys onto the selected personality and leaves the rest.
- `mergeFrameFills` catches an iframe plus a top document.

Prior art: none. This repo started from `PLAN.md`.

The Chrome wiring is checked by loading the built extension against the demo, not by a fake `chrome` object.

## Out of Scope

Embeddings, paraphrase reuse beyond the slot rules, `<all_urls>`, Workday's custom widgets, LinkedIn Easy Apply, silent save on submit, a popup review list, Dexie, and an offscreen document. Ordinary fields on any website are filled. The submit demo opens the side panel with profile details filled in. It does not write the personality until Save profile.

## Further Notes

The user could not answer the grill. Assumptions are recorded in `.scratch/beta/grilling.md` and the ADRs. `write-a-prd` and `prd-to-plan` in the skills collection are now `to-spec` and `to-tickets`; this file and the tickets under `.scratch/beta/issues/` are those artifacts.

"United States" and "US" are the same slot and not the same exact question, so that pair is a suggestion. England, Scotland, and Wales are treated as the UK slot because the conflict the plan calls out is US versus UK.
