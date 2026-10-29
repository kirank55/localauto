# Changelog

## 0.1.0-beta.1

The first beta release. Install it from the zip on the [release page](https://github.com/kirank55/localauto/releases).

Checked against live Greenhouse, Lever, and Ashby application forms, filling only.

### Fills real forms

- Greenhouse's dropdown questions are picked, reviewed, and reused. Before, a saved answer was typed into the dropdown's search box and reported as filled.
- Lever's checkbox questions keep their question. Before, "Are you eligible to work in the United States?" was saved as the question "Yes".
- Questions are stored without required stars, (Optional) tags, or text from location dropdowns.
- Radios and checkboxes are clicked, so React forms such as Ashby keep the choice.
- "Current company" is no longer offered for "Current location". Words like current, preferred, and please do not count toward a suggestion.

### Side panel

- Fill works in a tab that was open before Localauto was installed or updated. No reload.
- A saved profile folds into a summary, so Fill is in reach. Edit profile opens it.
- Results stay with the page they came from. Switching tabs keeps them and says which page they are from. Navigating that tab clears them. Accept checks the question is still the same before it writes.
- Suggestion cards show the answer beside Accept. Exact reuse says "Saved answer".

### Settings

- Saved answers lists every answer with where and when it was kept. Delete one, or delete all after a confirm.
- An answer deleted in Settings stays deleted when the side panel saves the profile.

### Release

- `npm run zip` builds `localauto-0.1.0-beta.1-chrome.zip`. Chrome shows the version as 0.1.0-beta.1.
- `npm run store-assets` writes Chrome Web Store screenshots and the promo tile.
- [PRIVACY.md](PRIVACY.md) and [docs/store-listing.md](docs/store-listing.md).
