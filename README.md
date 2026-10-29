# Localauto

Localauto is a Chrome extension that fills job application forms on your device, on any website. It uses a profile you type in, and answers you confirm. A repeated question fills on click. A paraphrase is only a suggestion until you accept it.

Nothing is uploaded. There is no account. See [PRIVACY.md](PRIVACY.md).

The beta is the first slice in [PLAN.md](PLAN.md): profile fields, confirm-save, exact reuse, and slot-gated suggestions, on any website. It is checked against live Greenhouse and Lever forms, including Greenhouse's dropdown questions and Lever's checkbox questions. A personality is a named profile. Default is selected until you choose another. Embeddings, Workday's custom widgets, and LinkedIn Easy Apply are not in this version.

## Install the beta

You need Chrome 116 or newer. You do not need Node.

1. Download `localauto-<version>-chrome.zip` from the [latest release](https://github.com/kirank55/localauto/releases).
2. Unzip it into a folder you will keep. Chrome loads the extension from that folder.
3. Open `chrome://extensions` and turn on **Developer mode**.
4. Choose **Load unpacked** and select the unzipped folder.
5. Pin Localauto. Click the icon to open the side panel.

To update, unzip the new release over the same folder and press the reload arrow on the Localauto card in `chrome://extensions`. Your profile and saved answers stay.

Chrome asks for permission to read and change data on all websites. That is how Fill reaches the page you have open. Localauto does not request browsing history. It does not run on `file:` or `ftp:` pages. [PRIVACY.md](PRIVACY.md) explains each permission.

## Build from source

You need Node 22 or newer.

```bash
npm install
npm test
npm run build
```

Load `.output/chrome-mv3` with **Load unpacked**, as above. `npm run dev` rebuilds the extension while you work. `npm run zip` writes the release zip to `.output/`.

## Use it

1. In the side panel, enter your name, email, phone, and links, then **Save profile**. The profile folds into a summary. **Edit profile** opens it again. The personality button switches between Default, Personal, Work, Software engineer, and profiles you create.
2. Open an application and choose **Fill empty fields**. Profile fields and saved answers go into empty visible fields.
3. Answer a custom question yourself. Choose **Review answers on this form**, uncheck anything you do not want kept, then **Keep** the ones to reuse.
4. On the next application, **Fill empty fields** again. The same question fills. A different wording shows under Suggestions with the source question. **Accept** writes that one field.

Results stay with the page they came from. Switching tabs keeps them. If that tab moves to another page, they clear.

**Settings**, opened from the side panel, lists every saved answer. Delete one, or delete them all. Settings is also where you add or delete a personality, pause Greenhouse, Lever, or the local demo, and turn the submit prompt on or off. Other websites stay on. Default stays.

With the submit prompt on, submitting a form opens the side panel with the name, email, phone, and links from that form in the profile. **Save profile** keeps them.

If a tab was open before you installed or updated Localauto, the first Fill adds Localauto to that tab. You do not need to reload it.

Fill will not touch:

- a field that already has a value
- a hidden field
- a password field
- a payment field (card number, CVV, and similar)

A one-word name fills First name and leaves Last name empty. Lever's single Name field gets the full name.

## What fills where

| | Profile fields | Text answers | Yes/no and choice questions |
| --- | --- | --- | --- |
| Greenhouse (`job-boards.greenhouse.io`, `boards.greenhouse.io`) | Yes | Yes | Yes, including the dropdowns |
| Lever (`jobs.lever.co`) | Yes | Yes | Yes, including checkbox questions |
| Ashby | Yes | Yes | Native controls only. Ashby's yes/no buttons are not filled |
| Other websites | Yes, when the field says what it is | Yes | Native radios, checkboxes, and selects |

Not filled in this beta: file uploads such as a resume, date pickers, location pickers that need a choice from a list, multi-select dropdowns, Workday, and LinkedIn Easy Apply.

## Demo

In another terminal:

```bash
npm run demo
```

Open http://127.0.0.1:4173

- [Greenhouse-style application](http://127.0.0.1:4173/greenhouse.html), with a dropdown built like Greenhouse's
- [Lever-style application](http://127.0.0.1:4173/lever.html), with Lever's markup and checkbox questions
- [A second form with paraphrased questions](http://127.0.0.1:4173/return-visit.html)
- [The Greenhouse form inside an iframe](http://127.0.0.1:4173/embedded.html)
- [A submit button, so you can see the listener](http://127.0.0.1:4173/submit.html)

## Try it

```bash
npm run try
```

This opens Playwright's Chromium with the extension loaded, the side panel in front, and the submit demo in the other tab. Close the window to stop. Saving a source file reloads the extension. Install that browser once with `npx playwright install chromium`.

## Tests

```bash
npm test
npm run check
npm run test:e2e
```

`npm test` is the behavior suite. `npm run check` also typechecks and checks that package internals stay private. `npm run test:e2e` builds the extension and drives the demo in Playwright's Chromium: profile fill, confirm-save, a Greenhouse-style dropdown, Lever markup, results clearing when the page changes, an iframe, and a tab that was open before install. Install that browser once with `npx playwright install chromium`. Current branded Chrome builds ignore `--load-extension`, so the automated check does not launch system Chrome.

`npm run store-assets` builds the extension and writes Chrome Web Store screenshots and the promo tile to `.output/store/`.

## How matching works

1. Profile slots, from the control's type, autocomplete, name, and a short label.
2. Exact reuse, when the question matches aside from case, punctuation, a required star, or an (Optional) tag.
3. A suggestion, when the country, yes/no, and numbers agree, the questions share a meaningful word, and you accept it. Words like "current", "preferred", and "please" do not count, so "Current company" is not offered for "Current location".

"Authorized to work in the United States" and "authorised to work in the US" can be a suggestion. "Authorized to work in the UK" is not. "Tell us about yourself" is not a United States question.

Saved answers are reused across websites. The newest answer wins when the same question was saved twice. At most 300 answers are kept. A checkbox question saves the checked choices, joined by commas.

## Layout

`src/packages/form-memory` is the behavior. The side panel, content scripts, and demo are adapters. Tests call the package, and they also load the files in `demo/` so the pages you click are the pages the tests fill.

Greenhouse draws its dropdowns with react-select, which ignores events a content script can send. A small script in the page picks the option through the component, the same way a click does. It holds no saved data. See [ADR 0006](docs/adr/0006-page-script-picks-greenhouse-dropdowns.md).

## Assumptions

The beta was built without a review pass on the open questions. These are the calls that were made:

- `chrome.storage.local` instead of Dexie, until the history outgrows it.
- Suggestions need a shared significant word, not only agreeing slots, so unrelated yes/no questions stay quiet.
- "US" counts as a country in "the US", "U.S.", "USA", and "United States", not in "tell us".
- England, Scotland, and Wales count as the UK slot.
- Any http or https website can be filled. Greenhouse, Lever, and the local demo are the sites you can pause. Pausing Greenhouse covers `boards.greenhouse.io` and `job-boards.greenhouse.io` only.
- There is no per-site opt-in. `<all_urls>` is not used, so `file:` and `ftp:` pages stay out.
- `scripting` is requested so Fill works in a tab that was open before install, without a reload. See [ADR 0007](docs/adr/0007-fill-adds-itself-to-open-tabs.md).
- The spec and tickets live in `.scratch/beta/` rather than GitHub Issues.

## Feedback

This is a beta. If a form fills the wrong field, or a field you expected stays empty, [open an issue](https://github.com/kirank55/localauto/issues) with the site and the question. Do not paste your answers.
