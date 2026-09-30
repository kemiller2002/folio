---
id: EV-PRINT-2026-D1A7
title: Forma Studio workflow projection printed with existing Folio primitives
research_area: print-components
evidence_type: primary
source_title: tests/run-diagram-projection-tests.mjs (local execution, Chromium 141.0.7390.37, Ghostscript 10.02.1, poppler)
source_author: folio test suite
source_uri: tests/run-diagram-projection-tests.mjs
source_date: 2026-09-30
retrieved: 2026-09-30
created_by_agent: claude-code
confidence: medium
supports: []
contradicts: []
related_theories: []
tags: [print, diagram, workflow, metadata, privacy, grayscale, backgrounds-off, forma-studio]
work_item: FOLIO-GH-25
---

# Evidence Record

## Evidence summary

A Forma Studio projection (`tests/fixtures/diagrams/purchase-request/`, projection
1.0.0, Forma diagram contract 2.0.0) was composed into a Folio document using
only existing primitives: `ef-print-document`, `ef-print-section`,
`ef-print-figure`, `ef-print-table` and `ef-print-note`. The projection markup
was embedded verbatim. Page fitting was a CSS `zoom` on the diagram viewport
in consumer document CSS; no graph geometry was rewritten.

Deterministic Chromium PDFs were produced for Letter and A4, with backgrounds
enabled (color) and disabled. A grayscale PDF was produced by converting the
color PDF with Ghostscript (`-sColorConversionStrategy=Gray`), which models a
grayscale printer and keeps text as text.

## Exact claim supported

For this seven-node, three-lane workflow in Chromium:

1. The whole canvas prints on one landscape page for Letter (scale 0.816) and
   A4 (scale 0.787). The smallest text measures 7.34pt and 7.08pt, and connector
   strokes measure 1.22pt and 1.18pt (EPC-DIAG-M1-005, EPC-DIAG-SCALE-001/002).
2. Portrait requests are rotated rather than scaled below the 7pt floor.
   Letter portrait would give 5.84pt and A4 portrait 5.66pt. When rotation is
   not allowed, the plan reports that tiling is required, and composition
   refuses (EPC-DIAG-SCALE-003/004).
3. No node, group or connector label falls outside the canvas or is clipped,
   and there is no page-level overflow (EPC-DIAG-025/146).
4. Node labels, lanes, legend entries, relationship sentences, value states
   (default, derived from lane) and line-style words appear in the extracted text
   of every mode. Backgrounds-off text equals color text; grayscale text equals
   color text as a normalized word multiset (EPC-DIAG-M1-003, EPC-COLOR-020..027).
5. The color PDF contains the authored fills (#efe6fb, #fde8d7, #e3f4e1). The
   backgrounds-off PDF contains none of them and keeps at least 60% of the
   dark boundary and text pixels. The grayscale PDF has chroma <= 3 and at
   least 90% of the dark pixels (EPC-DIAG-M1-002, EPC-COLOR-023/024).
6. The source-only cost center (`CC-7731-RESTRICTED`, "Cost center") and the
   export-only ticket URL and tags do not appear in the projection, the composed
   HTML, the PDF text or the PDF document metadata (EPC-DIAG-M1-004,
   EPC-META-061, EPC-DIAG-145).
7. The inspection gate refuses tampered projections: script, event handlers,
   `javascript:`, `foreignObject`, comments, undocumented data attributes,
   editor-state classes, disallowed style values, digest mismatch, a stale
   revision, a non-rendered scope, diagnostic status and an unsupported version
   (EPC-DIAG-SEC-001..005, EPC-DIAG-HANDOFF-003..006).

## Decision relevance

Existing primitives were sufficient. `ef-print-figure` carried the diagram and
`ef-print-table` carried the ID-keyed metadata index with links to each object
(EPC-DIAG-064/151). This slice therefore gives no evidence for a public
`ef-print-diagram` element (EPC-DIAG-120..122, EPC-DIAG-M1-007).

Two consumer-CSS needs recurred and are candidates for a future recipe if a
second fixture needs them. The first is a fit-scale hook on the diagram
viewport. The second is a diagram print root of 12pt, because Forma sizes
diagram text in rem and Folio's 10.5pt default root would push value-state
text below 7pt.

## Limitations

- Chromium only. Firefox and WebKit were not run locally, because the
  browsers could not be downloaded in the execution environment. CSS `zoom` is
  standardized and supported by current engines, but portable output is not
  claimed until those runs exist (EPC-DIAG-147).
- The fit plan's reserved header height (0.85in) is calibrated for this
  document shape; the DOM and page-1 text checks are the authority.
- Tiling (EPC-DIAG-023/149) is planned only as a refusal path; it is not
  implemented.
- Browser-generated PDFs are not claimed to be tagged or accessible. The text
  relationship list and the ID-keyed index are the accessible equivalents
  (EPC-DIAG-082).
