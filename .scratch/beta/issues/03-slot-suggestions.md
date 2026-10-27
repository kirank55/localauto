# 03: Slot-gated suggestions

**What to build:** When a question is not an exact match, the side panel offers at most one past answer if the country, yes/no, and number slots agree and the questions share a significant word. Accept writes it. A US/UK conflict, a 5-versus-10 conflict, "tell us" read as a country, and an unrelated yes/no pair produce no suggestion.

**Blocked by:** 02: Confirm-save and exact reuse

**Status:** done

- [x] "United States" is offered, and not applied, for "the US", and Accept checks Yes.
- [x] The UK authorization question is not offered that answer.
- [x] "Tell us" is not the United States, while "in the US" and "United States" can suggest each other.
- [x] A years paraphrase is offered, and a conflicting number is not.
- [x] Relocation is not offered for a veteran question.
- [x] A sponsorship paraphrase is offered and not selected until Accept.
