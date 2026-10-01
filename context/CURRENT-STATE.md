# Echelon Print Components current state

## Repository status

Greenfield repository initialized on 2026-09-22.

Installed foundation:

- ROS 3.1.4
- SDE / Ordo 1.3.0
- Visual Engineering 1.0.0
- Communication Engineering 1.0.0 operational context
- Limen 0.6.2

Communication Engineering 1.0.0 was installed from a pinned repository commit
because the package metadata is current but that version was not available from
npm at bootstrap time.

## Observed facts

- Comprehensive product requirements are recorded in
  `docs/requirements/PRINT-COMPONENTS-REQUIREMENTS.md`.
- The proposed standards-first architecture is recorded in
  `docs/architecture/PRINT-ARCHITECTURE.md`.
- A dated browser/paged-media research baseline is recorded in
  `docs/research/PRINT-WEB-CAPABILITY-BASELINE-2026-09.md`.
- Modern Chromium supports CSS page-margin boxes and current/total page counters.
- Current Firefox and Safari do not provide the same page-margin-box capability.
- Mainstream browsers do not implement page-box background descriptors or
  paged-media bleed/crop marks.
- The passive light-DOM core surface is implemented: document, title page, section, back page, header, footer, page-number intent, columns, sidebar, artwork layer, break, keep, callout, figure, table, code, TOC, and note.

## Current decision posture

- Use semantic HTML and light-DOM custom elements.
- Let CSS/renderers own pagination; do not build a JavaScript pagination engine.
- Use explicit P0/P1/P2/P3 renderer capability profiles.
- Keep deterministic Chromium PDF generation outside core.
- Keep advanced publishing engines optional until experiments justify an adapter.
- Use Limen only for meaningful interactive preview/configuration state and browser effects.

## Active work

The 0.2.0 core primitive expansion is implemented on GH-11. Continue the experiment sequence where renderer guarantees remain open:

1. light-DOM custom-element fragmentation;
2. Chromium margin headers/footers/page counters;
3. multi-page columns;
4. portable side-panel layouts;
5. long tables and landscape named pages;
6. background/page artwork behavior;
7. font readiness/page-count stability;
8. PDF accessibility inspection;
9. enhanced-renderer comparison.

## Largest decision-relevant unknown

Which small public component surface gives applications enough print expressiveness
without creating a second HTML vocabulary or locking core to a particular renderer?

## Baseline

The architecture baseline is ordinary semantic HTML/CSS print styling without the
library. Experiments should compare the component abstraction against that baseline
for correctness, complexity, portability, and rework rather than merely proving
that a browser can print HTML.


## Folio documentation work

Tracked work item GH-4 is building the Folio documentation/showcase site.

The site contract:

- Echelon Foundry visual language;
- one page per currently registered Folio component;
- at least three standalone print-ready examples per component;
- actual `src/styles/print.css` used inside isolated preview documents;
- explicit P0/P1/P2/P3 capability teaching;
- no browser JavaScript in generated documentation;
- explicit agent usage contract;
- GitHub Pages deployment after validation.

The site deliberately does not create pages for merely planned components.


## Folio mobile documentation hardening

Tracked work item GH-6 strengthens the Folio documentation site for phone-width use.

The mobile contract now requires:

- no page-level horizontal overflow at 320px, 390px, or 430px;
- touch-friendly primary and component navigation;
- internally scrollable code/tables rather than page overflow;
- embedded print previews that remain understandable on phones;
- screen-only inspection adaptations for columns, sidebars, and wide tables;
- preservation of the original Folio print-media contract under `@media print`;
- Chromium, Firefox, and WebKit verification.


## Core component mobile behavior

Tracked work item GH-9 moves narrow-screen behavior from documentation-only demo CSS into Folio's public stylesheet.

Current mobile posture:

- `ef-print-columns`: screen widths <= 48rem collapse to one column; print preserves the authored column count.
- `ef-print-sidebar`: screen widths <= 48rem stack main and rail; print preserves the side-rail grid.
- `ef-print-document`, `ef-print-title-page`, `ef-print-section`, `ef-print-back-page`, `ef-print-break`, and `ef-print-keep`: ordinary block/fragmentation primitives already flow naturally on narrow screens and receive no unnecessary responsive override.
- responsive behavior is CSS-only; no JavaScript runtime is introduced.
- browser validation audits every registered component page and a standalone demo for every registered component at 320px, 390px, and 430px in Chromium, Firefox, and WebKit.


## Professional profile document family

Tracked work item GH-17 (`kemiller2002/folio#17`) adds the Resume / Professional Profile family.

Current posture:

- canonical requirements `FOLIO-RES-001`..`099` in `docs/requirements/PRINT-COMPONENTS-REQUIREMENTS.md` §27;
- `DF-PRINT-2026-0004`: stylesheet recipes in a public `ef-print-recipes` layer, no resume/job/education elements;
- fixtures `RESUME-01` and `RESUME-02` reproduce kemiller2002/resume `index.html` and `developer.html` (ba786e4); `PROFILE-03` is a fictional profile on Letter with a different visual system;
- `npm run test:profiles` checks word parity with committed reference snapshots (five declared reference defects), geometry, keeps, Letter/A4 adaptation, no-JavaScript output, and phone widths 320/390/430 across engines;
- Chromium 141 local evidence recorded in `EV-PRINT-2026-0006`; Firefox/WebKit legs of the suite run in CI.

## Journal and scholarly publication family

Tracked work item GH-28 (`kemiller2002/folio#28`) adds standalone scholarly articles and complete journal issues.

Current posture:

- canonical requirements `FOLIO-JRN-001`..`260` in `docs/requirements/PRINT-COMPONENTS-REQUIREMENTS.md` §29;
- `DF-PRINT-2026-0005`: thirteen generic publication recipes in `ef-print-recipes`, no journal elements, authored numbering, citation/math/conversion upstream, renderer-owned pagination;
- fixtures `JOURNAL-ARTICLE-01` (8 pages, two columns, landscape appendix) and `JOURNAL-ISSUE-01` (18 pages: cover, masthead, contents, editorial, divisions, four article types, back matter, sponsor page, back cover); `npm run test:journal`;
- Chromium 141 evidence in `EV-PRINT-2026-0007`, including three Chromium defects with consumer workarounds and follow-up `WI-0001`;
- `JOURNAL-ENHANCED-01` P3 comparison with Vivliostyle 2.45.1 (out of tree) in `EX-PRINT-2026-0008`/`EV-PRINT-2026-0008`: footnotes, target pages, running strings, recto/blank pages, and bleed/marks observed; page floats unsafe; nothing promoted;
- consumer guide `docs/recipes/JOURNAL-PUBLICATION.md`; site family at `/journals/`.

## Folio 0.2.0 core primitive expansion

Tracked work item GH-11 closes the original architecture-only gap for header, footer, page-number, artwork layer, callout, figure, table, code, TOC, and note primitives.

Evidence posture:

- all 18 public elements register idempotently as passive light-DOM custom elements;
- the public CSS defines printable fallback behavior without a JavaScript pagination engine;
- Chromium, Firefox, and WebKit run the primitive contract fixture;
- documentation generation requires three examples and capability/maturity metadata for every registered element;
- MARGIN-01 remains the evidence for Chromium physical margin boxes and Page X of Y;
- ART-01 remains the evidence for suppressible artwork with preserved essential foreground content;
- TABLE-01 remains the evidence for long-table/header/landscape behavior;
- renderer-sensitive features remain explicitly capability-bound instead of being promoted to P0.
