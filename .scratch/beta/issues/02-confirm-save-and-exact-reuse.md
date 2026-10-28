# 02: Confirm-save and exact reuse

**What to build:** After answering a custom question, the person reviews it in the side panel and confirms the save. The next form, including a form on the other application host, fills that question when the wording matches aside from case and punctuation. Yes/no choices select the matching option. Profile fields are not stored again as questions. Saving the same question replaces the previous answer.

**Blocked by:** 01: Fill a profile into Greenhouse and Lever

**Status:** done

- [x] Collecting answers on a page returns answered custom questions and skips profile fields.
- [x] An exact question fills a textarea on the next form, including across Lever and Greenhouse.
- [x] An exact yes/no answer selects the matching option.
- [x] Repeating a question updates the saved answer and keeps its id.
- [x] Storage that is not a profile and answer list loads as empty memory.
