# Frames report results instead of asking for browsing history

`tabs` and `webNavigation` both warn that the extension can read browsing history. Localauto asks every matching frame to send its own fill result, and the side panel merges those results. It still does not declare `tabs` or `webNavigation`. Which websites those frames run on is ADR 0005.
