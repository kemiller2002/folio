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

`npm test` also runs the Forma icon suites: `npm run test:forma-icons` (adapter, no browser) and `npm run test:forma-icon-print` (FORMA-ICON-PRINT-01, Chromium only; Letter, A4, grayscale via Ghostscript and backgrounds-off PDFs in `test-results/forma-icon-print/`). The print suite uses a committed fixture of the published Forma 0.5.0 icon release (ahead of the 0.4.1 pin); see `tests/fixtures/forma-icons/SOURCE.md`.

`npm run experiment:journal-enhanced` is an optional P3 comparison (JOURNAL-ENHANCED-01, `EX-PRINT-2026-0008`). It is not part of `npm test`: the enhanced renderer is not a dependency. Install `@vivliostyle/cli` outside the repository and set `VIVLIOSTYLE_CLI` (and optionally `VIVLIOSTYLE_BROWSER`); without it only the Chromium leg runs.

Important limitation: Playwright exposes Chromium PDF generation, but not equivalent Firefox/WebKit PDF generation. The Firefox/WebKit portion therefore proves print-media DOM/layout equivalence, not final paginated-output equivalence. That limitation must remain visible in the research record.
