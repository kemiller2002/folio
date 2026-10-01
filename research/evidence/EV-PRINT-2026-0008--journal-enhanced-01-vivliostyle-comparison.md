---
id: EV-PRINT-2026-0008
title: JOURNAL-ENHANCED-01 Chromium P2 versus Vivliostyle P3 comparison
research_area: print-components
evidence_type: primary
source_title: Folio JOURNAL-ENHANCED-01 experiment run
source_author: echelon-print-components
source_uri: tests/run-journal-enhanced-experiment.mjs
source_date: 2026-10-01
retrieved: 2026-10-01
created_by_agent: claude-code
confidence: low
supports:
  - HY-PRINT-2026-0010
contradicts: []
related_theories: []
tags: [print, journal, enhanced-renderer, vivliostyle, footnotes, running-strings, target-counter, recto, bleed]
---

# Evidence Record

## Evidence summary

The same three semantic sources (JOURNAL-ENHANCED-01, JOURNAL-ARTICLE-01,
JOURNAL-ISSUE-01) were rendered with Playwright/Chromium 141.0.7390.37 and with
Vivliostyle CLI 11.3.3 (core 2.45.1), installed out of tree and hosted by the
same Chromium 141 binary. Feature observations come from poppler text and
bounding-box extraction and from page rasters.

## Exact claim supported or contradicted

Supports HY-PRINT-2026-0010 with one contradiction (page-float placement): an
optional enhanced renderer provides several scholarly P3 features from the same
source, while Chromium degrades to readable in-flow output without loss.

## Relevant excerpt or data

| Observation (JOURNAL-ENHANCED-01) | Chromium 141 | Vivliostyle 2.45.1 |
| --- | --- | --- |
| Pages | 4 | 5 |
| Page box | 612 x 792 pt | 702.7 x 882.7 pt (trim + bleed + marks) |
| Bottom-of-page footnotes (`float: footnote`) | no; "(Note: …)" in flow | yes, page foot, numbered 1-4 across articles |
| Target-page references (`target-counter`) | none (declaration dropped) | 4 ("Figure 2 (p. 1)") |
| Running string on continuation page | no | yes ("Whitcombe & Laine · Night cooling in courtyards") |
| Running string suppressed on article openings (`first-except`) | n/a | yes, all 3 openings |
| `@page name:nth(1)` suppression | not applicable (rule dropped) | not honoured |
| Recto starts | page breaks only; Erratum on page 4 (verso) | all openings odd; blank page 4 inserted |
| Running matter on inserted blank page (`@page :blank`) | n/a | suppressed |
| Page float (`float: top; float-reference: page`) | in-flow spanning figure | moved to top of page 1, above the article title; `float-defer: 1` had no effect |
| Authored words lost | 0 | 0 |

Portable fixtures under Vivliostyle: JOURNAL-ARTICLE-01 8 pages with page 8
landscape, JOURNAL-ISSUE-01 18 pages; no authored words lost; MathML, multicolumn
flow, spans, margin boxes, and named pages rendered comparably to Chromium in
rasters.

## Interpretation

Vivliostyle is a credible P3 candidate for true footnotes, running strings,
target-page references, recto starts, blank-page handling, and bleed/marks.
Page floats are not yet safe for scholarly openings, and per-group `:nth()`
selectors are not available; `first-except` strings are the working mechanism
for first-page suppression.

## Limitations

- One run, one engine version, small fixture; confidence is low.
- Vivliostyle was hosted by Chromium 141; its own default browser was not used.
- Document scripts did not run inside the Vivliostyle viewer (custom elements
  stayed un-upgraded), which is consistent with Folio's no-JavaScript contract.
- PDF/UA tagging, CMYK, and prepress conformance were not evaluated.
- Footnote numbering continued across articles; resetting per article was not
  attempted.

## Counterevidence

Page-float placement above the article title contradicts the prediction that
the enhanced renderer improves float behavior for scholarly layout.

## Reproduction or verification notes

Install `@vivliostyle/cli@11.3.3` outside the repository, then run
`VIVLIOSTYLE_CLI=… VIVLIOSTYLE_BROWSER=… npm run experiment:journal-enhanced`.
Without `VIVLIOSTYLE_CLI` only the Chromium leg runs. Results are written to
`test-results/journal-enhanced/results.json`.
