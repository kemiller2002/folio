---
id: HY-PRINT-2026-0009
title: Semantic HTML plus generic publication recipes compose scholarly articles and multi-article issues without journal elements
research_area: print-components
status: supported
confidence: medium
created: 2026-10-01
author_agent: claude-code
supporting_evidence:
  - EV-PRINT-2026-0007
contradicting_evidence: []
related_theories: []
supersedes: []
superseded_by: []
---

# Hypothesis

## Statement

Ordinary semantic HTML, existing Folio elements, and a small set of generic
publication recipes can produce a multi-page two-column scholarly article and
a complete journal issue (cover, masthead, TOC, editorial, several article
types, division pages, back matter, back cover) in screen, portable browser
print, and deterministic Chromium PDF output, without journal-specific custom
elements, CSS-generated scholarly numbering, or DOM measurement.

## Predictions

- The deterministic Chromium PDF contains every word of the semantic source
  exactly once (no loss or duplication across page and column fragments).
- Output without JavaScript is textually and page-count identical.
- Letter and A4 outputs lose and duplicate no words.
- No page ends on a section heading; figures and their captions do not split.
- Articles in the issue start at the top of a new page and the physical page
  counter is continuous across articles.
- At 320/390/430 px screens, there is no page-level horizontal overflow and
  multicolumn bodies collapse to one column; print media restores columns.

## Falsification

Any lost or duplicated word, a heading stranded at a page foot, a split
figure/caption pair, page-level horizontal overflow on a phone width, or a
layout that only works with JavaScript falsifies the hypothesis for the
affected fixture.

## Boundary

Running strings, first-page suppression within named-page groups,
target-page references, true footnotes, recto starts, and bleed/marks are out
of scope for P0-P2 and are tested separately by JOURNAL-ENHANCED-01.
