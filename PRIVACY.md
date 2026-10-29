# Privacy

Localauto keeps everything on your device. It has no server, no account, no analytics, and no remote code. It makes no network requests of its own.

## What it stores

- **Profiles.** For each personality: the name, email, phone, LinkedIn, GitHub, and website you type in, or that you choose to keep after a form submit.
- **Saved answers.** Each question and answer you choose to keep with **Keep**, the website it came from, and the time you kept it. At most 300.
- **Settings.** Which personality is selected, which of Greenhouse, Lever, and the local demo are paused, and whether a submit opens the side panel.
- **A pending submit.** When a form is submitted with the submit prompt on, the profile fields from that form wait in session storage until the side panel shows them. Chrome clears session storage when the browser closes.

All of it lives in the extension's own `chrome.storage`, on this device. Websites cannot read it. Chrome sync is not used.

## What it reads

When you choose **Fill empty fields** or **Review answers on this form**, Localauto reads the form controls on the page you have open: their labels and the values in them. With the submit prompt on, it also reads name, email, phone, and link fields from a form when that form is submitted. It never reads password or payment fields, and it does not save anything from a page unless you choose **Keep** or **Save profile**.

## What it writes

Fill writes your profile and saved answers into empty visible fields on the page you have open, after you click. Accept writes one suggested answer into one field. What you then submit to that website is between you and that website.

## Deleting your data

- One saved answer, or all of them: **Settings → Saved answers**.
- A personality: **Settings → Personalities → Delete profile**.
- Everything: remove the extension in `chrome://extensions`. Chrome deletes its storage with it.

## Permissions

| Permission | Why |
| --- | --- |
| Read and change data on all websites (`http://*/*`, `https://*/*`) | Application forms live on many sites and often inside iframes. The content script must already be on the page for Fill and the submit prompt to work. `file:` and `ftp:` pages are not included. |
| `storage` | Keeps profiles, saved answers, and settings on this device. |
| `sidePanel` | The side panel is where you fill and review. |
| `activeTab` | Lets the toolbar button act on the tab you are looking at. |
| `scripting` | Adds Localauto to a tab that was open before you installed or updated it, the first time you choose Fill there. |

Localauto does not request `tabs`, `history`, or `webNavigation`, and cannot read your browsing history.

## Contact

Questions or concerns: [open an issue](https://github.com/kirank55/localauto/issues). Vulnerabilities go through a [private advisory](https://github.com/kirank55/localauto/security/advisories/new). See [SECURITY.md](SECURITY.md).
