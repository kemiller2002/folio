---
id: DF-PRINT-2026-0004
title: Adopt stylesheet recipes, not domain elements, for professional-profile layout
status: accepted
type: decision-record
created: 2026-09-29
updated: 2026-09-29
tags: [architecture, recipes, resume, professional-profile, public-api]
supersedes: []
superseded_by: []
related_documents:
  - research/evidence/EV-PRINT-2026-0006--resume-reference-reproduction-evidence.md
  - research/hypotheses/HY-PRINT-2026-0008--semantic-html-plus-stylesheet-recipes-reproduce-dense-professional-profiles.md
  - docs/recipes/PROFESSIONAL-PROFILE.md
---

# DF-PRINT-2026-0004

## Context

Issue #17 asked Folio to reproduce kemiller2002/resume as a canonical document
family without resume-only primitives. The reference needs an identity/contact
header, dated entries with end-aligned date ranges, compact accomplishment
lists, inline and labeled collections, a categorized dense grid, and
keep-with-next behavior.

Every one of those patterns is applied to different native elements depending
on meaning: a `header`, `li`, or `div` row; a `ul` or `ol` collection; a
`dl` label/value pair. A custom element would either wrap native semantics
without adding a layout contract or force a single element choice.

## Decision

1. Add a public `ef-print-recipes` cascade layer to `print.css` with documented
   class contracts: `.ef-identity`, `.ef-row` (+ `[data-row-end]`), `.ef-entry`,
   `.ef-lead-list`, `.ef-inline-list`, `.ef-labeled`, `.ef-category-grid`, and
   `.ef-dense`.
2. Tokens use the `--ef-print-*` namespace; recipes sit after
   `ef-print-components` so unlayered consumer CSS always wins.
3. Recipes are public API: each carries capability/maturity metadata, three
   documentation examples, and fixture evidence, like public elements.
4. Do not add `ef-print-resume`, `ef-print-job`, `ef-print-education`,
   `ef-print-employer`, or any other domain element.
5. Page size, page frame, type scale, and section naming remain consumer CSS.

## Rejected alternatives

- Domain elements mirroring resume sections: domain meaning in Folio core.
- A generic `ef-print-row` element: forces one element where authors need `li`,
  `header`, or `div`, and adds nothing CSS cannot express.
- Fixed grid coordinates copied from the reference: not reusable, and they
  collide with long headings.
- JavaScript fitting or measurement for date alignment.

## Consequences

Folio's public surface grows by stylesheet contracts, not elements. The site
and agent guidance must document recipes explicitly. Recipe changes are
pagination-sensitive and require profile fixture evidence.
