# Frames report results instead of asking for browsing history

`tabs` and `webNavigation` both warn that the extension can read browsing history. Localauto declares host access only for Greenhouse, Lever, and the local demo, then asks every matching frame to send its own fill result. The side panel merges those results. Arbitrary sites, and `<all_urls>`, stay out of the beta.
