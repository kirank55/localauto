# Localauto

A local-only tool that learns answers from the applications a person has already filled.

## Language

**Profile**:
The name, email, phone, and links a person typed into Localauto.
_Avoid_: resume, CV, account

**Profile slot**:
A fixed field role — name, email, phone, or a link — recognized from the control itself.
_Avoid_: attribute, mapping

**Saved answer**:
A question and the answer a person confirmed, kept on the device.
_Avoid_: response, memory entry, snippet

**Question**:
The label of a form control.
_Avoid_: prompt, field name

**Exact reuse**:
Filling a saved answer because the normalized question is the same.
_Avoid_: cache hit

**Suggestion**:
A past answer offered for a different wording. It is applied only after the person accepts it.
_Avoid_: fuzzy fill, recommendation, prediction

**Slot**:
A fact pulled out of a question: a country, a yes/no question, or a number.
_Avoid_: entity, feature, tag

**Slot conflict**:
Two questions whose slots disagree. A conflict never becomes a suggestion.
_Avoid_: mismatch

**Fill**:
Writing values into empty visible fields after the person clicks Fill.
_Avoid_: autofill, inject, scrape

**Application host**:
A site Localauto is allowed to run on.
_Avoid_: domain, origin

**Confirm-save**:
The person reviews the questions on the page and chooses which answers to keep.
_Avoid_: capture, scrape, sync
