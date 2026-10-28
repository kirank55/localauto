# Localauto

Localauto is a Chrome extension that fills Greenhouse and Lever job applications on your device. It uses a profile you type in, and answers you confirm. A repeated question fills on click. A paraphrase is only a suggestion until you accept it.

Nothing is uploaded. There is no account.

The beta is the first slice in [PLAN.md](PLAN.md): Greenhouse, Lever, profile fields, confirm-save, exact reuse, and slot-gated suggestions. A personality is a named profile. Default is selected until you choose another. Submitting a form opens the side panel with name, email, and phone filled in. Save profile keeps them. Embeddings, Workday, and LinkedIn Easy Apply are not in this version.

## Install

You need Node 22 or newer, and Chrome.

```bash
npm install
npm test
npm run build
```

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Choose **Load unpacked** and select the `.output/chrome-mv3` folder.
4. Pin Localauto. Click the icon to open the side panel.

`npm run dev` rebuilds the extension while you work. Load `.output/chrome-mv3` from a production build, or the dev output folder WXT prints, the same way.

Chrome asks for permission to read and change data on Greenhouse, Lever, and localhost. That is how Fill reaches those pages. The extension does not request browsing history, and it does not run on other sites.

## Demo

In another terminal:

```bash
npm run demo
```

Open http://127.0.0.1:4173

- [Greenhouse-style application](http://127.0.0.1:4173/greenhouse.html)
- [Lever-style application](http://127.0.0.1:4173/lever.html)
- [A second form with paraphrased questions](http://127.0.0.1:4173/return-visit.html)
- [The Greenhouse form inside an iframe](http://127.0.0.1:4173/embedded.html)
- [A submit button, so you can see the listener](http://127.0.0.1:4173/submit.html)

Reload the demo tab once after you load the extension so the content script is present.

## Try it

```bash
npm run try
```

This opens Playwright's Chromium with the extension loaded, the side panel in front, and the submit demo in the other tab. Close the window to stop. Saving a source file reloads the extension. Install that browser once with `npx playwright install chromium`.

## Use it

1. In the side panel, leave **Default** selected, choose Personal, Work, or Software engineer, or **Create profile**. Enter the name, email, phone, and links for that personality. **Fill empty fields** saves it and writes it into empty visible fields.
2. Answer a custom question on the page. Choose **Find answers to save**, uncheck anything you do not want kept, then **Save selected**.
3. On the next application, **Fill empty fields** again. The same question fills. A different wording shows under Suggestions with the source question. **Accept** writes that one field.

Settings, opened from the side panel, is where you add or delete a profile, pause Greenhouse, Lever, or the local demo, and turn the submit prompt on or off. Default stays. Submit the demo form and the side panel opens with those details filled in. **Save profile** keeps them.

Fill will not touch:

- a field that already has a value
- a hidden field
- a password field
- a payment field (card number, CVV, and similar)

A one-word name fills First name and leaves Last name empty. Lever's single Name field gets the full name.

## Tests

```bash
npm test
npm run check
npm run test:e2e
```

`npm test` is the behavior suite. `npm run check` also typechecks and checks that package internals stay private. `npm run test:e2e` builds the extension and fills the demo in Playwright's Chromium. Install that browser once with `npx playwright install chromium`. Current branded Chrome builds ignore `--load-extension`, so the automated check does not launch system Chrome. Loading the unpacked folder yourself is still how you use the beta.

## How matching works

1. Profile slots, from the control's type, autocomplete, name, and a short label.
2. Exact reuse, when the question matches aside from case and punctuation.
3. A suggestion, when the country, yes/no, and numbers agree, the questions share a meaningful word, and you accept it.

"Authorized to work in the United States" and "authorised to work in the US" can be a suggestion. "Authorized to work in the UK" is not. "Tell us about yourself" is not a United States question.

Saved answers are reused across Greenhouse and Lever. The newest answer wins when the same question was saved twice. At most 300 answers are kept.

## Layout

`src/packages/form-memory` is the behavior. The side panel, content script, and demo are adapters. Tests call the package, and they also load the files in `demo/` so the pages you click are the pages the tests fill.

## Assumptions

The beta was built without a review pass on the open questions. These are the calls that were made:

- `chrome.storage.local` instead of Dexie, until the history outgrows it.
- Suggestions need a shared significant word, not only agreeing slots, so unrelated yes/no questions stay quiet.
- "US" counts as a country in "the US", "U.S.", "USA", and "United States", not in "tell us".
- England, Scotland, and Wales count as the UK slot.
- Only `boards.greenhouse.io`, `job-boards.greenhouse.io`, and `jobs.lever.co`, plus localhost for the demo. EU hostnames and older company subdomains are not included.
- Pausing one of those hosts is the opt-in. There is no way to add an arbitrary site.
- The spec and tickets live in `.scratch/beta/` rather than GitHub Issues.
