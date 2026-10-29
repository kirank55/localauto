# Assumptions

The beta was built without a review pass on the open questions in [`PLAN.md`](../PLAN.md). These are the calls that were made.

## Storage

`chrome.storage.local` holds profiles and saved answers until the history outgrows it. See [ADR 0001](adr/0001-chrome-storage-for-the-beta.md).

## Suggestions

A suggestion needs a shared significant word and agreeing slots, so unrelated yes/no questions stay quiet.

"US" counts as a country in "the US", "U.S.", "USA", and "United States". It stays an ordinary word in "tell us".

England, Scotland, and Wales count as the UK slot.

## Hosts

Any http or https website can be filled. Greenhouse, Lever, and the local demo are the sites you can pause. Pausing Greenhouse covers `boards.greenhouse.io` and `job-boards.greenhouse.io`.

There is no per-site opt-in. `<all_urls>` stays unused, so `file:` and `ftp:` pages stay out. See [ADR 0005](adr/0005-any-website-is-an-application-host.md).

`scripting` is requested so Fill works in a tab that was open before install, without a reload. See [ADR 0007](adr/0007-fill-adds-itself-to-open-tabs.md).

## Where the work is tracked

The spec and tickets for this slice live in `.scratch/beta/`.
