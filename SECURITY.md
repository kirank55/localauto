# Security

Localauto is a browser extension. It is not a hosted service, and it does not phone home. Profiles, saved answers, and settings stay in the extension's own `chrome.storage` on the device. See [PRIVACY.md](PRIVACY.md).

## Reporting

Open a [private security advisory](https://github.com/kirank55/localauto/security/advisories/new). Include the extension version from `chrome://extensions`, your Chrome version, and a way to reproduce the issue. Leave out your profile and saved answers.

Public issues are for forms that fill the wrong field. Vulnerabilities stay in the advisory.

## Supported versions

| Version | Status |
| --- | --- |
| 0.1.0-beta.1 | Current beta. |

## What you should protect

- The browser profile Localauto is installed in. Extension storage is readable by someone who can use that Chrome profile, or who can read Chrome's files on disk.
- The release zip. Check its SHA-256 sum before you load it. See [Verifying a release](#verifying-a-release).

Chrome sync is not used. Removing the extension deletes its storage with it.

## What the extension refuses to do

- Make a network request of its own. There is no account, no analytics, and no remote code.
- Run on `file:` or `ftp:` pages. Host access is `http://*/*` and `https://*/*`. `<all_urls>` is not requested.
- Fill a field that already has a value, a hidden field, a password field, or a payment field.
- Read a password or payment field, or save a page unless you choose **Keep** or **Save profile**.
- Apply a suggestion until you accept that one field.
- Request `tabs`, `history`, or `webNavigation`.

Fill and the submit prompt read the form on the page you have open, after you click or after a submit with the prompt on. What you then send to that website is between you and that website.

## Verifying a release

Every release built by [`.github/workflows/release.yml`](.github/workflows/release.yml) includes `localauto-<version>-chrome.zip` and a `.sha256` sum of that zip. Download both into the same folder, then:

```sh
sha256sum -c localauto-0.1.0-beta.1-chrome.zip.sha256
```

On macOS:

```sh
shasum -a 256 -c localauto-0.1.0-beta.1-chrome.zip.sha256
```

The check prints `OK` when the zip matches the sum published with that release. Load the unzipped folder only after that.

## Releases

Pushing a `v*` tag runs the release workflow. It tests, builds the Chrome zip, writes the SHA-256 sum, and publishes one GitHub release. Tags with a `-` are prereleases. The tag has to match `version` in `package.json`.
