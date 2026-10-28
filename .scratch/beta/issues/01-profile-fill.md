# 01: Fill a profile into Greenhouse and Lever

**What to build:** From the side panel, a person saves a name, email, phone, and links, opens a Greenhouse or Lever application (or the local demo), and clicks Fill. Empty visible profile fields update, including a split first and last name and Lever's single name field. The page's own input events see the new values.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] A Greenhouse-style form receives first name, last name, email, phone, LinkedIn, GitHub, and website from the profile.
- [x] A Lever-style name field receives the full name, and Portfolio receives the website.
- [x] A single-word name does not invent a last name.
- [x] A long question that mentions email is not treated as the profile email.
- [x] Text is written through the native value setter and dispatches input and change.
