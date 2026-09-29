---
id: EV-PRINT-2026-0006
title: RESUME-01/RESUME-02/PROFILE-03 reference reproduction evidence
research_area: print-components
evidence_type: primary
source_title: kemiller2002/resume reference renders and Folio profile fixture suite
source_author: echelon-print-components
source_uri: https://github.com/kemiller2002/resume/tree/ba786e461d6ead25e28dde0913d2a7773e780379
source_date: 2026-09-29
retrieved: 2026-09-29
created_by_agent: claude-code
confidence: medium
supports:
  - HY-PRINT-2026-0008
contradicts: []
related_theories: []
tags: [print, resume, professional-profile, recipes, chromium, fragmentation]
---

# Evidence Record

## Evidence summary

The reference resume (`index.html`, `developer.html` at `ba786e4`) was rendered
with its own Knockout 3.5.1 binding (npm copy, byte-identical to the SRI-pinned
CDN file) in Chromium 141.0.7390.37 at print media. Folio fixtures RESUME-01
and RESUME-02 were built from the rendered output and compared as PDFs.

## Exact claim supported or contradicted

Supports HY-PRINT-2026-0008: the reference layouts are reproducible from
semantic HTML plus Folio recipes without domain elements, fixed coordinates, or
DOM measurement.

## Relevant excerpt or data

| Measure | Reference index | RESUME-01 | Reference developer | RESUME-02 | PROFILE-03 |
| --- | --- | --- | --- | --- | --- |
| Page size | A4 | A4 | A4 | A4 | Letter |
| Pages | 4 | 4 | 3 | 3 | 2 |
| Extracted words (whitespace tokens) | 1,147 | 1,144 | 595 | 592 | 341 |
| Undeclared missing/extra words | — | 0 | — | 0 | n/a |
| Letter adaptation pages | — | 4 | — | 3 | 2 (A4) |

Declared reference defects (see `tests/fixtures/profiles/reference/manifest.json`):

- RD-01 empty `Projects` heading (empty data array);
- RD-02 `Test Automation` category heading with no items;
- RD-03 `[object Object]` contact link in the developer variant;
- RD-04 developer variant prints `February 2024 -` without `Present`;
- RD-05 developer variant stringifies the study list without a separator.

Geometric results (Chromium, print media): every `[data-row-end]` region is
end-aligned within 1.5 px, single-line, on the first primary line, and does not
intersect primary text, including PROFILE-03's 102-character organization
heading; all PDF words lie inside the 10 mm (A4) or 0.6 in (Letter) content box;
no page ends on a section heading or entry header; JavaScript-disabled output is
textually identical with identical pagination.

Screen results (Chromium): at 320, 390, and 430 px there is no page-level
horizontal overflow, identity headers stack, row dates move below primary text,
and category grids collapse to one column; switching the same viewport to
print media restores two-track rows and the authored identity layout.

Visual comparison at equivalent A4 geometry (60 dpi page rasters side by side):
the header, highlights, entry/date relationships, accomplishment bullets,
technology grid, education, awards, and speaking sections align with the
reference; the largest observed offset is about 5 CSS px of vertical drift on
page 1. Category groups now stay whole across pages where the reference split
one group.

## Interpretation

The resume's layout contracts are general: they are the same shapes used by
CVs, publication lists, credentials, and project histories. A stylesheet
recipe layer carries them without widening the custom-element surface.

## Limitations

- PDF evidence is Chromium only. Firefox/WebKit results cover screen and
  print-media computed layout, not paginated PDF output.
- Keep behavior is renderer intent; a group taller than a page may still split.
- The reference page frame (`@page { border }`) is Chromium page-box
  decoration and is not a portable guarantee.
- The authoring environment used Chromium 141 while the repository pins
  Playwright 1.63 (Chromium 153); CI is the authoritative run.

## Counterevidence

Recipe v1 applied `break-after: avoid` to header-only entries, which chained
through parents and pushed a run of entries to the next page in RESUME-02. The
contract now applies keep-with-next only when the header has following content.

## Reproduction or verification notes

Run `npm run test:profiles` (or `npm test`). Output PDFs are written to
`test-results/profile-fixtures/`.
