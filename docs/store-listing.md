# Chrome Web Store listing

Copy for the Chrome Web Store developer dashboard. Upload `.output/localauto-<version>-chrome.zip` from `npm run zip`. Images come from `npm run store-assets` and land in `.output/store/`.

## Store listing

**Name:** Localauto

**Summary** (132 characters at most):

> Fill job applications from your profile and answers you confirmed. Paraphrases wait for you. Everything stays on your device.

**Category:** Workflow & Planning

**Language:** English

**Description:**

> Localauto fills job application forms from a profile you type in and from answers you chose to keep. It runs on your device. There is no account and no server.
>
> • Fill: open an application and click Fill empty fields. Your name, email, phone, and links go into empty fields. Questions you answered before fill in too.
> • Keep: after you answer a custom question, choose Review answers on this form and keep the ones you want to reuse.
> • Suggestions: when a question is worded differently, Localauto shows the past answer and where it came from. Nothing fills until you click Accept. "Authorized to work in the US" is never offered for a UK question.
> • Personalities: keep separate profiles, such as Personal and Work.
> • Safe by default: Localauto never fills password or payment fields, hidden fields, or fields you already filled.
>
> Works with Greenhouse and Lever, including Greenhouse's dropdown questions and Lever's checkbox questions, and with ordinary forms on other websites.
>
> This is a beta. Workday and LinkedIn Easy Apply are not supported yet.

**Screenshots** (1280×800): `screenshot-1-fill.png`, `screenshot-2-review.png`, `screenshot-3-suggestions.png`, `screenshot-4-settings.png`

**Small promo tile** (440×280): `promo-small-440x280.png`

**Icon** (128×128): `public/icon/128.png`

**Homepage URL:** https://github.com/kirank55/localauto

**Support URL:** https://github.com/kirank55/localauto/issues

## Privacy practices

**Single purpose:**

> Fill job application forms on the page the user has open, from a profile and answers the user saved in the extension.

**Permission justifications:**

- **Host permissions (`http://*/*`, `https://*/*`):** Job applications are hosted on many different websites and are often embedded in iframes on company sites. The content script has to be present on the page before the user clicks Fill, and in every frame, to read form labels and write the user's own saved values into empty fields. `file:` and `ftp:` are excluded.
- **storage:** Stores the user's profiles, the answers they chose to keep, and their settings locally with `chrome.storage.local`.
- **sidePanel:** The side panel is the extension's interface for filling, reviewing suggestions, and saving answers.
- **activeTab:** Lets the toolbar action open the side panel for the current tab.
- **scripting:** Chrome does not add content scripts to tabs that were already open when the extension was installed or updated. When Fill gets no answer from such a tab, the extension injects its own packaged content scripts into it so the user does not have to reload the page and lose what they typed.

**Remote code:** No. All code is in the package.

**Data usage.** Check:

- Personally identifiable information (name, email, phone, profile links the user types in)
- Website content (form questions and the user's answers, only when the user chooses to keep them)

Certify:

- Data is not sold to third parties.
- Data is not used or transferred for purposes unrelated to the single purpose.
- Data is not used or transferred to determine creditworthiness or for lending.

All of it stays in `chrome.storage` on the user's device. Nothing is transmitted.

**Privacy policy URL:** https://github.com/kirank55/localauto/blob/main/PRIVACY.md

## Distribution

Publish as **Unlisted** for the beta, so only people with the link can install it, then switch to Public.
