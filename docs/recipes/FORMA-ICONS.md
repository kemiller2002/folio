# Using Forma icons in Folio print and PDF output

**Status:** Implemented and proven end to end against a committed,
clearly labelled **pre-release** Forma 0.5.0 icon fixture (GH-45, issue #45).
Folio's real Forma pin is still 0.4.1, which publishes no icons, so with the
pin as committed every icon reference prints as inert data and the words carry
the meaning. Swapping the pin to a *published* 0.5.0 is the remaining step
(see "Moving the pin").

## Contract

Folio never owns, copies or redraws canonical Forma icon geometry
(Forma `ICON-001..018`). It consumes the static artifacts a pinned Forma
release bundles in `dist/icons/`:

- `registry.json` with `schemaVersion: 1`, `grid: 24`, `formaVersion` and, per
  icon, `svgSha256`;
- `<name>.svg` static SVG.

`tools/forma-icons.mjs` (package export `./forma-icons`):

- `loadFormaPin(root)` reads the Forma version from the Conditor authority
  (`.conditor/authority/resolved-release-set.json`) after checking its sha256
  in `conditor.json`. That pin decides everything below.
- `loadIconLibrary({ pin, assetsRoot })` returns an immutable library. A pin
  older than 0.5.0 is `unavailable` and never reads the disk. Otherwise the
  registry must match the pin's `formaVersion`, every SVG's bytes must match
  its `svgSha256`, and every SVG must match Forma's static grammar (24-unit
  viewBox, `currentColor` 1.8 strokes, only `path`/`circle`/`rect`). Scripts,
  `foreignObject`, `href`, `use`, `image`, `style`, event handlers, comments and
  `data:`/`javascript:` URLs are refused even when the digest is re-signed.
  Any finding makes the whole release unusable; nothing unverified is exposed.
- `renderIcon(library, { name, label, size })` is pure. Icons are decorative
  (`aria-hidden="true"`) unless the document supplies `label`, which yields
  `role="img"` plus that accessible name. Forma's icon label is never used as
  an accessible name.

`tools/forma-icon-print.mjs` (package export `./forma-icon-print`) is the print
pipeline:

```html
<tr data-status="warning">
  <th scope="row">Grayscale print</th>
  <td><span data-ef-icon="warning"></span> Status: Warning</td>
</tr>
<span data-ef-icon="workflow" data-ef-icon-label="Workflow stage: release" data-ef-icon-size="36pt"></span>
```

```js
import { loadFormaPin, loadIconLibrary } from "@echelon-foundry/print-components/forma-icons";
import { composeIconPrintDocument, printOfflinePdf } from "@echelon-foundry/print-components/forma-icon-print";

const library = loadIconLibrary({ pin: loadFormaPin(repoRoot), assetsRoot: "<pinned forma>/dist/icons" });
const composed = composeIconPrintDocument({ title, body, page: "a4", stylesheets: [folioPrintCss], documentCss, library });
const { pdf, requests } = await printOfflinePdf(playwrightPage, composed, { path: "out.pdf" });
// requests is empty: every request was blocked and recorded
```

- An empty `<span data-ef-icon="…">` reference prints nothing before
  compilation, so the document is useful without icons.
- `compileIconReferences` swaps references for verified static SVG. Unknown or
  future names, invalid names and every reference under an icon-less pin stay
  in the document as `hidden` inert data (`data-ef-icon-state="unknown" |
  "invalid" | "unavailable"`). Compiling again with a newer verified library
  resolves them.
- `composeIconPrintDocument` produces one self-contained, script-free HTML file
  (stylesheets inlined, `@page` size `letter` or `A4`). It refuses an
  unverified release and any markup or CSS that could reach the network
  (`src`, `href` other than `#…`, `url()`, `@import`, `link`, `img`, `script`, …).
- `printOfflinePdf` drives an injected Playwright page (Folio does not import a
  browser) with every request aborted and recorded, then calls Chromium
  `page.pdf`.

Status must be printed in words. Icon and colour only repeat it, and both are
allowed to disappear in grayscale or backgrounds-disabled output.
`print.css` owns size (`--ef-print-icon-size`), alignment, `currentColor` and
forced colours (`.ef-print-icon`).

## Evidence

`npm run test:forma-icons` covers the adapter without a browser: pin
resolution, digest mismatch, missing or mismatched registry, injection,
unknown IDs, and offline refusal.

`npm run test:forma-icon-print` composes `tests/fixtures/forma-icons/status-report.html`
and prints it offline with Chromium to `test-results/forma-icon-print/`:

- Letter colour (612 x 792 pt, 2 pages), A4 colour (2 pages), Letter with
  `printBackground: false`, Letter converted to grayscale by Ghostscript, and
  Letter under the repository's real pin (0.4.1, no icons);
- no request in any document, plus a control showing the guard records one;
- every status in words in every output, and icons add no extracted text;
- icons are vector strokes (no raster images) and add strokes over the
  icon-less print;
- status glyph ink beside each status word in colour, A4, grayscale and
  backgrounds-off; tints present in colour, gone without backgrounds; no chroma
  in grayscale;
- one `img` role (the document-named figure); status cells' accessible names
  are exactly the status words; forced colours keep icons in the text colour;
- printed glyphs compared with `tests/fixtures/forma-icons/visual-baseline.json`
  and printed at release scale (the r=9 circles are 39.6pt at 48pt).

Set `FOLIO_FORMA_PACKAGE_DIR=<extracted package>/package` to also check the
fixture bytes and registry entries against a Forma package and print every
icon in it.

## Moving the pin

Forma 0.5.0 is not published yet. Do not point the pin at it until it is.
After the release:

1. Move Folio's pin through Conditor (`conditor upgrade`) so
   `.conditor/authority/resolved-release-set.json` names Forma 0.5.0 and its
   release tarball sha256.
2. Extract the released tarball and run
   `FOLIO_FORMA_PACKAGE_DIR=… npm run test:forma-icon-print`. Refresh the
   fixture files from the release if they differ, set `PROVENANCE.json`
   `status` to `published` and `artifactSha256` to the released tarball's
   sha256. The suite fails until both match the pin.
3. The same suite then prints the document under the real pin with icons.
