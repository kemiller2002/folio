# Print experiment tests

These tests are research/conformance tests, not yet a public package test suite.

## Prerequisites

- Node.js 24
- Playwright 1.63.0 browsers: Chromium, Firefox, WebKit
- Poppler tools: `pdfinfo` and `pdftotext`

Install test tooling:

```bash
npm install
npx playwright install --with-deps chromium firefox webkit
```

Then run:

```bash
npm test
```

The test runner:

1. compares the native and light-DOM component fixtures under print media in Chromium, Firefox, and WebKit;
2. generates actual Chromium PDFs for both pagination fixtures and compares page count plus normalized extracted text;
3. generates the MARGIN-01 PDF and verifies authored running header/footer text plus Page X of Y counters;
4. writes `test-results/print-experiments/results.json` and PDFs for inspection.

`npm test` also runs the machine-operability suite (`npm run test:machine`) across Chromium, Firefox, and WebKit. It verifies semantic role/name discovery, stable native targets, passive custom-element upgrade, and light-DOM preservation. These checks intentionally use public semantics rather than CSS implementation selectors or coordinate-driven actions.

`npm test` also runs the fixture suites: reports, Tutela, professional profiles (`npm run test:profiles`), journal publications (`npm run test:journal`, JOURNAL-ARTICLE-01 and JOURNAL-ISSUE-01; PDFs in `test-results/journal-fixtures/`), and diagram projection. Set `FOLIO_ENGINES=chromium` to limit the profile and journal suites to one engine.

`npm test` also runs the Forma icon suites: `npm run test:forma-icons` (adapter, no browser) and `npm run test:forma-icon-print` (FORMA-ICON-PRINT-01, Chromium only; Letter, A4, grayscale via Ghostscript and backgrounds-off PDFs in `test-results/forma-icon-print/`). The print suite uses a committed fixture of the published Forma 0.5.0 icon release, the version Folio pins, and also prints the 0.4.1 icon-less control; see `tests/fixtures/forma-icons/SOURCE.md`.

`npm run experiment:journal-enhanced` is an optional P3 comparison (JOURNAL-ENHANCED-01, `EX-PRINT-2026-0008`). It is not part of `npm test`: the enhanced renderer is not a dependency. Install `@vivliostyle/cli` outside the repository and set `VIVLIOSTYLE_CLI` (and optionally `VIVLIOSTYLE_BROWSER`); without it only the Chromium leg runs.

Important limitation: Playwright exposes Chromium PDF generation, but not equivalent Firefox/WebKit PDF generation. The Firefox/WebKit portion therefore proves print-media DOM/layout equivalence, not final paginated-output equivalence. That limitation must remain visible in the research record.

## Universal UI layout/interaction conformance (GH-54)

`npm run ui:conformance` verifies Folio against the Visual Engineering contract
`framework/standards/UI-LAYOUT-INTERACTION.md` in
`kemiller2002/visual-engineering` (version pinned in
`tests/conformance/uli.mjs`; the standard is referenced, never copied). It
builds the site, runs the pure-rule unit tests
(`npm run test:ui-conformance:rules`, also part of `npm test`) and then
`tests/run-ui-conformance.mjs`. `npm run ui:conformance:print` and
`npm run ui:conformance:site` run one leg. The CI job `ui-conformance` in
`.github/workflows/folio-site-validation.yml` runs the full command and uploads
`test-results/ui-conformance/` (results.json plus every generated PDF).

Every check is a pure function in `tests/conformance/print-rules.mjs` or
`tests/conformance/site-rules.mjs` mapping measurements to findings
`{rule, status, location, state, evidence, measured, tolerance}` with status
`PASS`, `FAIL`, `UNKNOWN`, `NOT_APPLICABLE` or `EXCEPTION`. Missing evidence is
`UNKNOWN`, never `PASS`. The run exits non-zero on any `FAIL` that is not covered
by an owned, expiring exception in `tests/conformance/exceptions.json`.

Print surfaces (every HTML fixture under `tests/fixtures`, every generated demo
and preview under `site-dist`) are verified in two separate legs (ULI-L12):

1. **Browser print preview.** `page.emulateMedia({ media: "print" })` with the
   viewport set to the intended page content box resolved from the document's
   `@page` rules (including Folio's `--ef-print-page-size` and
   `--ef-print-page-margin`, and named pages): rendered text and replaced
   content stay inside the page box, no line spills out of its own block
   (columns, side rails, grid tracks), no print container clips content,
   headers/footers render and their `left`/`center`/`right` slots sit at the
   edge they name (also in right-to-left documents), and numeric cells never
   split a value.
2. **Chromium PDF.** `page.pdf({ preferCSSPageSize: true })`, extracted with
   Poppler: sane page count, every page at a declared page size, text on every
   page, no word beyond a page edge or (when margins are declared) inside the
   margins, the authored type scale preserved (detects Chromium
   shrink-to-fit), every rendered word present in the text layer, repeated
   table headers on continuation pages, `break-after: avoid` content kept with
   what follows, and declared running content (`data-uli-running-text`) on
   every page.

The adversarial fixtures in `tests/fixtures/conformance/` stress long
paragraphs, a table spanning pages, unbroken words and URLs inside every flow
primitive, right-to-left documents with embedded left-to-right runs, enlarged
type, empty sections, dense numeric data on a landscape named page, A4 with
custom margins, and P1 margin-box running content.

The site leg (Chromium by default; `FOLIO_ENGINES=chromium,firefox,webkit`
adds engines to the responsive layout checks) inventories every enabled
control on every documentation and preview page, verifies semantics and
accessible names (ULI-A01/A06), resolves every internal destination and
fragment (ULI-A02), opens every "Open standalone print preview" example action,
toggles every "View HTML" disclosure by pointer, Enter and Space and resets it
(ULI-A02/A05/A08/A10), follows the skip link and Tab-walks every documentation
page (ULI-A08), clicks through the primary navigation at 1280 and 390px, and
measures page overflow and navigation label integrity at 320/390/768/1280px
(ULI-L05/L06/L09). External links are checked for a valid URL only and stay
`UNKNOWN`: nothing is fetched and no external outcome is claimed.

Local runs need Poppler and a Chromium Playwright can launch. If the installed
Chromium build differs from the one Playwright 1.63 expects, set
`FOLIO_CHROMIUM_EXECUTABLE` to the Chromium binary instead of downloading
browsers. `--only=TEXT` narrows print surfaces for local diagnosis.
