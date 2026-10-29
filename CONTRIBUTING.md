# Contributing

Thanks for helping. Localauto is a beta, so a report from a real application form is the most useful thing you can send.

## Report a bug

Open an issue with the Localauto version from `chrome://extensions`, your Chrome version, the site host, the question text, what you expected, and what the field did. Leave out your answers, email, phone, resume, and any URL that contains them.

Security issues go through a private advisory. See [SECURITY.md](SECURITY.md).

## Propose a change

Open an issue first for anything larger than a fix, so we can agree on the shape before you write it. [`PLAN.md`](PLAN.md) is the spec for this slice. A change that moves something across that line needs the spec updated too. Decisions the spec left open are in [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md).

## Build and test

You need Node 22 or newer.

```sh
npm install
npm test            # behavior suite
npm run check       # typecheck, package boundaries, and the behavior suite
npm run test:e2e    # extension loaded in Playwright, against demo/
```

`npm run test:e2e` needs Playwright's Chromium: `npx playwright install chromium`. `npm run try` opens that browser with the extension loaded so you can click through a form.

## Conventions

- `src/packages/form-memory` is the behavior. The side panel, content scripts, and demo are adapters. Import a package through its entry points. See [`src/packages/README.md`](src/packages/README.md). `npm run lint:boundaries` enforces that.
- Words used in code and docs are defined in [`GLOSSARY.md`](GLOSSARY.md).
- A decision that should outlive the pull request goes in [`docs/adr/`](docs/adr/).
- Profiles and saved answers stay in `chrome.storage` on the device. See [ADR 0001](docs/adr/0001-chrome-storage-for-the-beta.md).
- Add a line to [`CHANGELOG.md`](CHANGELOG.md) under a new `## Unreleased` heading for anything a person using the extension would notice.

By contributing, you agree that your work is licensed under the [Apache-2.0](LICENSE) license.
