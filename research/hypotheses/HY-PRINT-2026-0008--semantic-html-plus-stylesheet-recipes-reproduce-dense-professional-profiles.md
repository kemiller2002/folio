---
id: HY-PRINT-2026-0008
title: Semantic HTML plus stylesheet recipes reproduce dense professional profiles without domain-specific elements
research_area: print-components
status: supported
confidence: medium
created: 2026-09-29
author_agent: claude-code
supporting_evidence:
  - EV-PRINT-2026-0006
contradicting_evidence: []
related_theories: []
supersedes: []
superseded_by: []
---

# Hypothesis

## Statement

A small set of Folio stylesheet recipes applied to ordinary semantic HTML
(identity header, aligned metadata row, entry keep, lead list, inline and
labeled collections, categorized grid, dense rhythm) can reproduce the
kemiller2002/resume executive and developer layouts and a materially different
professional profile, without any resume-specific custom element.

## Predictions

- The reproductions extract the same words as the reference PDFs except for
  explicitly declared reference defects.
- Reproductions paginate to within one page of the reference at A4/10 mm.
- Terminal date metadata never overlaps primary text and stays end-aligned.
- The same recipes serve a fictional profile with different sections, page
  size, and typography.
- Narrow screens reflow without horizontal overflow while print media keeps the
  authored layout.

## Evidence that would contradict it

A reproduction that needs fixed coordinates, DOM measurement, a domain element,
or per-document recipe forks; undeclared missing or duplicated words; date
collisions with long headings; or phone-width overflow.

## Tests performed

`tests/run-profile-fixture-tests.mjs` (RESUME-01, RESUME-02, PROFILE-03).

## Current assessment

Supported in Chromium 141 with deterministic PDF output (EV-PRINT-2026-0006).
Firefox and WebKit screen/print-media checks are part of the same suite and run
in CI; they were not available in the authoring environment.
