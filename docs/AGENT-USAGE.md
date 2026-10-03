# Folio Agent Usage

Status: canonical repository-local instructions for agents consuming or changing Folio.

## Purpose

Folio is the Echelon Foundry print component system in this repository.

It is a document-intent layer over semantic HTML and standards-based print CSS. It is not a general UI framework and it is not a JavaScript pagination engine.

Agents must preserve the distinction between:

- document content and meaning;
- Folio layout intent;
- renderer capability;
- interactive preview/configuration state.

## Required sequence

Before creating or changing printable document UI:

1. Start with semantic HTML and logical reading order.
2. Use ordinary HTML for headings, paragraphs, lists, tables, figures, links, and images.
3. Search the Folio component catalog and `src/components/register.js` for an existing print primitive.
4. Use a Folio custom element only when it expresses reusable print/layout intent.
5. Read the component's capability tier and maturity before promising renderer behavior.
6. Keep source content useful when JavaScript is unavailable or the custom element has not upgraded.
7. Prefer CSS/native browser pagination and fragmentation over DOM measurement.
8. Use Limen/Ordo only for meaningful preview/configuration state, not physical pagination.
9. Run print experiments and Folio site validation before claiming completion.
10. Preserve consumer-supplied object metadata only through an explicit visibility/transport policy; do not leak source-only metadata into print/PDF.
11. When printing workflows/diagrams, preserve authored color where supported but ensure the same meaning survives grayscale and backgrounds-disabled output.
12. Print Forma Studio diagrams through `tools/diagram-projection.mjs`. Call `inspectProjection` first, since the projection is untrusted input. Then call `planFit`, which never shrinks text below 7pt, and `composeDocument`, which embeds the markup verbatim inside `ef-print-figure`. Do not rewrite projection geometry or re-derive appearance from metadata.

## Current public component surface

The registered component list in `src/components/register.js` is authoritative. It currently also includes the report primitives `ef-print-metric`, `ef-print-integrity`, `ef-print-finding` and the Tutela `ef-print-security-*` family. The core list:

- `ef-print-document`;
- `ef-print-title-page`;
- `ef-print-section`;
- `ef-print-back-page`;
- `ef-print-header`;
- `ef-print-footer`;
- `ef-print-page-number`;
- `ef-print-columns`;
- `ef-print-sidebar`;
- `ef-print-layer`;
- `ef-print-break`;
- `ef-print-keep`;
- `ef-print-callout`;
- `ef-print-figure`;
- `ef-print-table`;
- `ef-print-code`;
- `ef-print-toc`;
- `ef-print-note`.

## Recipes

Recipes are public class contracts in the `ef-print-recipes` layer of `print.css` (`DF-PRINT-2026-0004`). Apply them to native elements when a reusable layout contract exists but the host element depends on meaning. The professional-profile recipes are:

- `.ef-identity` — name/identity region plus stacked or inline (`data-contact="inline"`) contact region;
- `.ef-row` with one `[data-row-end]` child — growing primary text plus end-aligned, single-line terminal metadata (dates, years, amounts);
- `.ef-entry` — repeated entry whose header keeps with its first content; `data-keep` for short entries;
- `.ef-lead-list` — native list with optional `<strong>` lead phrase; `data-marker="none"`;
- `.ef-inline-list` and `.ef-labeled` — inline collections with presentational separators, and label/value pairs;
- `.ef-category-grid` — groups of heading + list in auto-filled tracks, kept together where they fit;
- `.ef-dense` — compact rhythm and heading keep-with-next on the document root.

Rules: never put an `.ef-inline-list` inside `<p>`; author meaningful punctuation as text; keep list labels before lists in source; keep page size, page frame, type scale, and content selection in consumer CSS/application code. Do not add resume/job/education elements. See `docs/recipes/PROFESSIONAL-PROFILE.md`.

The publication recipes (`DF-PRINT-2026-0005`) serve journal articles and issues, proceedings, book chapters, reports, and manuals:

- `.ef-longform` — document-root long-form rhythm (justified, hyphenated, indented; `p[data-lead]`, `p[data-dropcap]`);
- `.ef-article` — article/chapter unit; `data-start="page"` or `"recto"` (recto is P3; browsers break to a new page);
- `.ef-article-header` — opening front matter with `[data-kicker]`, `h1`, `[data-subtitle]`; spans columns;
- `.ef-authors` / `.ef-affiliations` — contributor list with linked affiliation markers and `[data-orcid]`; affiliations with authored markers and IDs;
- `.ef-meta-list` — `dl` of `div` groups for DOI, dates, licence, citation, ISSN (`data-layout="inline"` for compact lines);
- `.ef-abstract` — plain or `data-variant="structured"` (run-in part headings);
- `.ef-caption` — `[data-label]`, `[data-note]`, `[data-source]` for figures, tables, listings;
- `.ef-equation` — `figure` around consumer MathML/SVG/HTML with an authored `(n)` figcaption;
- `.ef-column-span` — full-width block inside multicolumn flow;
- `.ef-reference-list` — hanging (author-year) or `data-style="numeric"` with authored `[data-marker]`;
- `.ef-endnotes` — authored notes with `[data-backlink]`;
- `.ef-declarations` — run-in funding/interests/contributions/data/ethics statements.

Rules: write every number (sections, figures, tables, equations, references, page ranges, contents pages) as text; never generate scholarly numbering with CSS counters; never format, sort, or validate citations (CSL and conversion run upstream); never simulate footnotes or target-page numbers with JavaScript; reuse `.ef-labeled` + `.ef-inline-list` for keywords, `.ef-category-grid` for editorial boards, `ef-print-toc` (`[data-detail]` lines) for contents, and `ef-print-note` for author notes; keep named pages (landscape, per-article running heads) outside multicolumn containers. Do not add `ef-print-journal`, `ef-print-article`, `ef-print-author`, or other scholarly elements. See `docs/recipes/JOURNAL-PUBLICATION.md`.

The Folio documentation generator fails if a newly registered public element lacks site metadata and three examples. Documentation examples must also remain usable at phone widths without changing the component's print-media contract.

## Capability tiers

### P0 — Portable browser

Common standards-based print behavior:

- print media;
- `@page` size/margins where supported;
- native page/column fragmentation;
- multicolumn flow;
- in-flow document structure;
- semantic tables/figures;
- graceful fallback.

P0 does not mean pixel-identical output across browsers and printers.

### P1 — Chromium margin boxes

Controlled Chromium features validated separately:

- authored page-margin headers/footers;
- current page counter;
- total page counter.

Never describe P1 as portable Firefox/Safari behavior.

### P2 — Deterministic Chromium

Controlled export contract:

- known Chromium version;
- font/image readiness;
- print media;
- print-background policy;
- browser chrome disabled;
- diagnostics and renderer metadata.

### P3 — Enhanced paged media

Optional dedicated publishing-engine integrations for features outside mainstream browser interoperability.

## Mobile and screen-preview behavior

Folio's public stylesheet is responsive on screens and keeps print behavior separate.

- `ef-print-columns` collapses to one column at screen widths of 48rem or less.
- `ef-print-sidebar` stacks to one column at screen widths of 48rem or less.
- Structural/content primitives use ordinary block flow. `ef-print-header` and `ef-print-footer` stack their regions on narrow screens, `ef-print-table` contains wide screen inspection with horizontal scrolling, and print media restores the authored print contract.
- These adaptations are screen-only. Print media preserves the authored column count, side-rail layout, break behavior, and renderer contract.
- Do not introduce JavaScript solely for responsive behavior.
- Do not change pagination semantics to make a screen preview fit.
- If consumer content itself is intrinsically wide, such as a large data table, preserve the content and use an explicit contained scrolling or alternate screen presentation strategy rather than clipping it.

## Machine operability

Read `docs/requirements/MACHINE-OPERABILITY.md` before adding or changing document structure or interactive preview/configuration behavior.

- Keep meaningful document content and relationships in semantic native HTML and inspectable light DOM.
- Preserve consumer-supplied stable IDs and URL/hash targets. Do not substitute page position, CSS classes or renderer coordinates for identity.
- Interactive preview/configuration actions follow the Forma machine-operability contract: role plus accessible name first, deterministic observable completion, and no coordinate-only, hover-only or pointer-only public action path.
- Direct manipulation may be a convenience path, but meaningful state changes need a semantic non-coordinate equivalent in the consuming application/Limen layer.
- Machine actors do not bypass application behavior, Ordo/domain legality, authorization or validation.
- Playwright is the reference verifier. Folio does not expose a privileged automation runtime.
- DOM conformance does not prove PDF accessibility; keep renderer/PDF evidence separate.

Run `npm run test:machine` for the cross-browser semantic conformance suite. It is also part of `npm test`.

## Boundary ownership

| Concern | Owner |
| --- | --- |
| Document data and semantic meaning | Consuming application |
| Reusable print/layout intent | Folio |
| Print CSS and Folio visual defaults | Folio |
| Physical pagination and fragmentation | Browser / selected renderer |
| Renderer capability guarantees | Capability profile / adapter |
| Interactive preview/configuration state | Limen + Ordo/application |
| Authorization/privacy/domain decisions | Consuming application |

## Do not

- build a DOM-measure-and-repage loop in Folio core;
- move meaningful application state into print custom elements;
- replace ordinary semantic HTML merely for styling;
- use Shadow DOM as the default printable-content container;
- claim renderer-specific behavior as portable;
- hide unsupported capabilities through silent approximation;
- depend on CSS visual reordering that contradicts reading order;
- put essential content only in suppressible background graphics;
- shrink text to illegibility to force wide content onto a page;
- promote `ef-print-sidebar` from provisional portability without stronger evidence;
- make pagination-sensitive token changes without print/PDF regression evidence.

## Component-specific cautions

### ef-print-sidebar

Current CSS Grid implementation is an experiment-backed candidate, not a frozen universal portability guarantee.

### ef-print-keep

`break-inside: avoid` is a request. A block taller than available page space may still fragment.

### ef-print-columns

Native multicolumn flow is accepted as the initial implementation, but real long content must still be tested under target renderers.

### ef-print-break

Use explicit page breaks for authored document structure, not as repeated trial-and-error repair for unstable layout.

### ef-print-header / ef-print-footer / ef-print-page-number

In-flow header/footer content is P0. `repeat="page"` and page-number formats express capability intent; physical repetition and current/total counters require a validated P1/P2/P3 renderer path. Never estimate page counts from DOM height.

### ef-print-layer

Artwork layers are document elements, not portable `@page` backgrounds. Essential information must remain outside decorative/suppressible artwork.

### ef-print-table

Keep native table semantics. Wide print output needs an authored strategy such as a named landscape page; do not solve width by shrinking text below a readable size.

### ef-print-toc / ef-print-note

Authored TOC page values and in-flow notes are portable. Automatic target-page counters, footnotes, bottom-of-page placement, and true sidenotes remain enhanced-renderer capabilities. Authored TOC page values are consumer data: regenerate them from a deterministic render and record which renderer produced them.

### Journal running matter (Chromium P1/P2)

Per-article running heads are static margin-box text on one named page per article; that forces a page break at each article boundary, and Chromium cannot suppress the head on an article's opening page (`@page name:first` is not matched). `counter(page)`/`counter(pages)` continue across named pages. In Chromium 141, `@page` specificity is not applied across stylesheets, and a captioned header-repeating table on a named page strands its caption; see `EV-PRINT-2026-0007` for workarounds.

## Adding a Folio component

When adding a registered public component:

1. define the semantic/layout need;
2. run or cite a fragmentation/rendering experiment proportional to its risk;
3. add the passive light-DOM element registration;
4. add print CSS;
5. add structural/print tests;
6. add Folio site metadata and at least three examples;
7. update capability/maturity guidance;
8. verify the documentation examples at narrow mobile widths as well as print media;
9. run ROS attribution and validation.

Adding or changing a public recipe carries the same obligations: capability/maturity metadata and three examples in the site generator (`tools/recipe-metadata.mjs`, `tools/journal-recipe-metadata.mjs`), fixture evidence (`npm run test:profiles` for the profile recipes, `npm run test:journal` for the publication recipes), and narrow-screen verification.

## Documentation site

The site is generated by `tools/build-site.mjs`.

Source:

- shell CSS: `site/site.css`;
- standalone preview CSS: `site/demo.css`;
- component registry: `src/components/register.js`;
- print CSS: `src/styles/print.css`;
- generated output: `site-dist/` (ignored).

Do not hand-edit `site-dist/`.

## Verification

For site-only work:

```bash
npm run site:check
npx playwright install chromium firefox webkit
npm run site:test:browser
```

For Folio implementation changes:

```bash
npm test                # includes npm run test:profiles
npm run site:check
npm run site:test:browser
./ros registry check
./ros validate
```

The established print experiment suite remains the authority for PDF/browser output evidence.

## Object metadata and workflow/diagram print

Read `docs/requirements/OBJECT-METADATA-AND-DIAGRAM-PRINT.md`.

- Printable objects may have descriptive metadata and stable external/object IDs.
- Keep source-only metadata, rendered metadata, export/provenance metadata, and accessibility metadata separate.
- Metadata remains consumer-owned. Folio does not infer domain meaning from it.
- Do not store hidden secrets or suppressed values in custom-element attributes, generated CSS, comments, SVG metadata, or PDF diagnostics.
- Workflow/diagram items may preserve authored fill, border/stroke, accent, connector, and safe foreground colors.
- Color never becomes the semantic source of workflow status/type.
- Use labels, shapes, line styles, markers, legends, or other non-color cues so output survives grayscale/background suppression.
- Prefer vector/semantic diagram projection and a structured/textual equivalent.
- Use content bounds plus fit-to-page/tiling rules; never rewrite graph geometry just to fit the page.
- Graph topology, routing, execution, legality, and application state remain outside Folio.
