<p align="center">
  <img src="website/favicon.svg" width="96" height="96" alt="Localauto">
</p>

<h1 align="center">Localauto</h1>

<p align="center">
  <b>The answer stays on this device.</b><br>
  A Chrome extension that fills job applications from a profile you type and answers you confirm.
</p>

<p align="center">
  <a href="https://github.com/kirank55/localauto/actions/workflows/ci.yml"><img src="https://github.com/kirank55/localauto/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/kirank55/localauto/releases"><img src="https://img.shields.io/github/v/release/kirank55/localauto?include_prereleases&label=release" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0"></a>
  <img src="https://img.shields.io/badge/chrome-116%2B-171717" alt="Chrome 116+">
</p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#use-it">Use it</a> ·
  <a href="#what-fills-where">What fills</a> ·
  <a href="#demo">Demo</a> ·
  <a href="#how-matching-works">Matching</a> ·
  <a href="#develop">Develop</a> ·
  <a href="PRIVACY.md">Privacy</a> ·
  <a href="SECURITY.md">Security</a>
</p>

The same question comes back on every application, worded a little differently each time. Localauto keeps the answer you confirmed and fills it when you click.

- **A repeated question fills.** Exact reuse ignores case, punctuation, a required star, and an (Optional) tag.
- **A paraphrase waits.** A suggestion shows the answer and the question it came from. Accept writes that one field. "Authorized to work in the United States" can be offered for "authorised to work in the US". A question about the UK stays empty when the saved answer is about the United States.
- **You choose what is kept.** Review the answers on the form and keep the ones to reuse.
- **It stays on this device.** Profiles, saved answers, and settings live in the extension's own storage. Localauto makes no network requests of its own. There is no account.

It is a Manifest V3 extension for Chrome 116 or newer. It fills http and https pages, including forms inside iframes, and it is checked against live Greenhouse and Lever applications, including Greenhouse's dropdown questions and Lever's checkbox questions. Apache-2.0.

> **Beta.** The spec for this slice is [`PLAN.md`](PLAN.md). Decisions it left open are in [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md). Changes are in [`CHANGELOG.md`](CHANGELOG.md). What stays on the device is [`PRIVACY.md`](PRIVACY.md).

## Install

You need Chrome 116 or newer. You do not need Node.

1. Download `localauto-<version>-chrome.zip` and the matching `.sha256` file from the [latest release](https://github.com/kirank55/localauto/releases).
2. Check the sum, then unzip into a folder you will keep. Chrome loads the extension from that folder.

   ```sh
   sha256sum -c localauto-0.1.0-beta.1-chrome.zip.sha256
   ```

   On macOS: `shasum -a 256 -c localauto-0.1.0-beta.1-chrome.zip.sha256`

3. Open `chrome://extensions` and turn on **Developer mode**.
4. Choose **Load unpacked** and select the unzipped folder.
5. Pin Localauto. Click the icon to open the side panel.

To update, unzip the new release over the same folder and press the reload arrow on the Localauto card in `chrome://extensions`. Your profile and saved answers stay.

Chrome asks for permission to read and change data on all websites. That is how Fill reaches the page you have open. Localauto does not request browsing history. It does not run on `file:` or `ftp:` pages. [PRIVACY.md](PRIVACY.md) explains each permission. [SECURITY.md](SECURITY.md#verifying-a-release) is the checksum check in full.

### Build from source

You need Node 22 or newer.

```sh
git clone https://github.com/kirank55/localauto
cd localauto
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

Fill leaves these alone:

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

Outside this beta: file uploads such as a resume, date pickers, location pickers that need a choice from a list, multi-select dropdowns, Workday, and LinkedIn Easy Apply. Embeddings are later. See [`PLAN.md`](PLAN.md).

## Demo

In another terminal:

```sh
npm run demo
```

Open http://127.0.0.1:4173

- [Greenhouse-style application](http://127.0.0.1:4173/greenhouse.html), with a dropdown built like Greenhouse's
- [Lever-style application](http://127.0.0.1:4173/lever.html), with Lever's markup and checkbox questions
- [A second form with paraphrased questions](http://127.0.0.1:4173/return-visit.html)
- [The Greenhouse form inside an iframe](http://127.0.0.1:4173/embedded.html)
- [A submit button, so you can see the listener](http://127.0.0.1:4173/submit.html)

## Try it

```sh
npm run try
```

This opens Playwright's Chromium with the extension loaded, the side panel in front, and the submit demo in the other tab. Close the window to stop. Saving a source file reloads the extension. Install that browser once with `npx playwright install chromium`.

## How matching works

1. Profile slots, from the control's type, autocomplete, name, and a short label.
2. Exact reuse, when the question matches aside from case, punctuation, a required star, or an (Optional) tag.
3. A suggestion, when the country, yes/no, and numbers agree, the questions share a meaningful word, and you accept it. Words like "current", "preferred", and "please" do not count, so "Current company" is not offered for "Current location".

"Authorized to work in the United States" and "authorised to work in the US" can be a suggestion. "Authorized to work in the UK" stays empty. "Tell us about yourself" has no country slot.

Saved answers are reused across websites. The newest answer wins when the same question was saved twice. At most 300 answers are kept. A checkbox question saves the checked choices, joined by commas.

`src/packages/form-memory` is the behavior. The side panel, content scripts, and demo are adapters. Tests call the package, and they also load the files in `demo/` so the pages you click are the pages the tests fill. See [`src/packages/README.md`](src/packages/README.md).

Greenhouse draws its dropdowns with react-select, which ignores events a content script can send. A small script in the page picks the option through the component, the same way a click does. It holds no saved data. See [ADR 0006](docs/adr/0006-page-script-picks-greenhouse-dropdowns.md).

## Develop

Node 22 or newer. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

```sh
npm install
npm test          # behavior suite
npm run check     # typecheck, package boundaries, and the behavior suite
npm run test:e2e  # builds the extension and drives the demo in Playwright
```

`npm run test:e2e` covers profile fill, confirm-save, a Greenhouse-style dropdown, Lever markup, results clearing when the page changes, an iframe, and a tab that was open before install. Install Chromium once with `npx playwright install chromium`. Current branded Chrome builds ignore `--load-extension`, so the automated check launches Playwright's Chromium.

`npm run store-assets` builds the extension and writes Chrome Web Store screenshots and the promo tile to `.output/store/`. Copy for the listing is in [`docs/store-listing.md`](docs/store-listing.md).

Pull requests run [`.github/workflows/ci.yml`](.github/workflows/ci.yml): the check above, then the Playwright smoke test.

## Privacy

Localauto has no server, no account, no analytics, and no remote code. Profiles and saved answers stay in `chrome.storage` on the device. Websites cannot read that storage. Chrome sync is not used.

Deleting one answer, a personality, or the extension itself is described in [`PRIVACY.md`](PRIVACY.md). Report a vulnerability through a private advisory, described in [`SECURITY.md`](SECURITY.md).

## Release

Pushing a `v*` tag runs [`.github/workflows/release.yml`](.github/workflows/release.yml). The tag must match `version` in `package.json` (`v0.1.0-beta.1` for `0.1.0-beta.1`). The workflow runs the test suite and the Playwright smoke test, builds `localauto-<version>-chrome.zip`, attaches a SHA-256 sum, and publishes one GitHub release. Tags with a `-` are prereleases. When `docs/releases/<tag>.md` exists, that file is the release notes.

## Feedback

This is a beta. If a form fills the wrong field, or a field you expected stays empty, [open an issue](https://github.com/kirank55/localauto/issues) with the site and the question. Do not paste your answers.
