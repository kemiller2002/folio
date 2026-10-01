---
id: EV-PRINT-2026-0007
title: JOURNAL-ARTICLE-01/JOURNAL-ISSUE-01 portable, Chromium paged-media, and renderer-defect evidence
research_area: print-components
evidence_type: primary
source_title: Folio journal fixture suite and Chromium 141 paged-media probes
source_author: echelon-print-components
source_uri: tests/run-journal-fixture-tests.mjs
source_date: 2026-10-01
retrieved: 2026-10-01
created_by_agent: claude-code
confidence: medium
supports:
  - HY-PRINT-2026-0009
contradicts: []
related_theories: []
tags: [print, journal, scholarly, recipes, chromium, fragmentation, named-pages, margin-boxes]
---

# Evidence Record

## Evidence summary

JOURNAL-ARTICLE-01 (8-page two-column research article) and JOURNAL-ISSUE-01
(18-page themed issue) were rendered by Playwright/Chromium 141.0.7390.37 at
print media and exported to PDF, and inspected with poppler `pdfinfo`/`pdftotext`
and 50-60 dpi page rasters. The same fixtures ran the recipe print contract and
320/390/430 px screen checks in Chromium. A separate probe established which
paged-media features Chromium 141 implements.

## Exact claim supported or contradicted

Supports HY-PRINT-2026-0009 for Chromium (P0 layout, P1 margin boxes, P2
deterministic export): ordinary semantic HTML plus Folio elements and the
thirteen publication recipes compose a scholarly article and a complete issue
without journal elements, generated numbering, or DOM measurement.

## Relevant excerpt or data

| Measure | JOURNAL-ARTICLE-01 | JOURNAL-ISSUE-01 |
| --- | --- | --- |
| Letter pages (Chromium 141) | 8 (page 8 landscape) | 18 |
| A4 pages | 8 | 17 |
| Authored words lost across fragmentation (Letter, A4, backgrounds off) | 0 | 0 |
| Page X of Y continuous on pages with running matter | 8 of 8 | 11 of 18 (7 bare pages suppressed) |
| Running head absent on opening page / present on continuations | yes / 7 of 7 | per-article named pages; openings carry the head (P1 limit) |
| Authored TOC values equal physical opening pages | n/a | 7 of 7 |
| Table header repeated | pages 4-5 (Table 2) | n/a |
| Stranded section headings | 0 of 18 checked | 0 of 27 checked |
| No-JavaScript PDF | textually identical, same pages | textually identical, same pages |

Chromium 141 feature probe (`@page` rules rendered to PDF, `CSS.supports`):

- Supported: `counter(page)`/`counter(pages)` continuous across named pages;
  static margin-box content per named page; named landscape pages;
  `column-span: all`; `@page :first` for the document's first page.
- Not supported: `@page name:first` for the first page of a named-page group;
  `string-set`/`string()` (empty); `target-counter()` (declaration dropped);
  `float: footnote` (note stays in flow); recto/verso (`break-before: right`
  and `recto` parse but start the next page without a blank verso); `bleed`.

Chromium 141 defects found while composing the fixtures, with workarounds in
consumer CSS:

1. `@page` selector specificity is applied within one stylesheet but not across
   stylesheets: a universal `@page { @top-right }` in a later sheet overrode a
   named page's `@top-right { content: none }` from an earlier sheet. Reduced
   to a two-stylesheet probe. Workaround: order page-furniture rules general to
   named in one sheet, or restate named rules after universal ones.
2. A table with `<caption>` and a repeating `thead` on a named page (landscape
   or per-article) left the caption at the foot of one page and moved the whole
   body to the next. Reproduced with and without the Folio wrapper; not with
   the caption removed, and not on the default page. Workaround: a preceding
   `.ef-caption` paragraph referenced by `aria-labelledby`.
3. A positioned or isolated `ef-print-back-page` (Folio applies
   `position: relative; isolation: isolate` for artwork layers) painted its
   leading border at the foot of the previous page as well as on its own page.
   Observed only in JOURNAL-ISSUE-01; not reduced to a minimal case. Workaround:
   `position: static; isolation: auto` on a back page without a layer.
   Follow-up: backlog item WI-0001.

## Interpretation

The journal family needs no new elements. Multicolumn fragmentation, spans,
repeated headers, named landscape pages, and continuous physical numbering
are available in Chromium; per-article running heads are expressible only as
static text per named page, which forces breaks at article boundaries and
cannot be suppressed on an article's opening page.

## Limitations

- PDF evidence is Chromium only and was produced with Chromium 141 while the
  repository pins Playwright 1.63 (Chromium 153); CI is authoritative. The
  authored TOC check is enforced only on the renderer recorded in the TOC.
- Firefox and WebKit legs (print-media computed contract and phone widths) run
  in CI; they were not available in the authoring container.
- Content conservation compares letters and four-letter words, so it detects
  lost or duplicated fragments, not visual clipping of extracted glyphs.
- The PDF is untagged; accessibility of PDF output is not claimed.
- Defects 1-3 are observations for Chromium 141 and may differ in newer builds.

## Counterevidence

Early composition placed the issue's division and sponsor pages in
`display: grid` named-page boxes; their borders appeared on preceding pages.
Switching to block boxes removed that symptom, and the remaining case was
traced to positioning (defect 3), so the grid observation is not recorded as a
separate defect.

## Reproduction or verification notes

`npm run test:journal` (part of `npm test`); PDFs and `results.json` are written
to `test-results/journal-fixtures/`. Set `FOLIO_ENGINES=chromium` to run one
engine.
