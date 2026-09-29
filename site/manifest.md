# Feature Manifest — Folio Documentation Site

## Purpose

Generate and publish a static documentation/showcase site for Folio's currently registered print components.

## Ownership

- registered component surface: `src/components/register.js`
- print implementation: `src/styles/print.css`
- site generation and component metadata: `tools/build-site.mjs`
- docs shell styling: `site/site.css`
- standalone preview styling: `site/demo.css`
- generated output: `site-dist/`
- renderer capability truth: architecture/research evidence

## Invariants

- one page per registered public element;
- at least three examples per element;
- no documentation pages for merely planned/unimplemented elements;
- actual Folio print CSS renders the previews;
- no browser JavaScript in generated documentation;
- capability tier and maturity are visible;
- sidebar remains explicitly provisional;
- generated output is never hand-edited.

## Verification

- `npm run site:check`
- `npm run site:test:browser`
- existing `npm test` print experiments
- ROS validation

## Modification boundaries

Normal:

- `site/**`
- `tools/build-site.mjs`
- site tests/workflows
- Folio site/agent documentation

Escalation/evidence required:

- adding a public print component;
- changing renderer capability promises;
- changing pagination-sensitive component behavior;
- promoting provisional layout behavior to portable;
- adding a pagination runtime.


## Mobile documentation contract

The Folio docs shell is responsive down to 320 CSS pixels.

Embedded demos may use screen-only inspection adaptations on narrow viewports, but those adaptations must never change `@media print` behavior or Folio's renderer capability claims.

Cross-browser site tests cover 320px, 390px, and 430px widths in Chromium, Firefox, and WebKit.


## Core responsive component contract

Folio's public stylesheet, not the documentation demo layer, owns component-level responsive behavior.

At screen widths <= 48rem:

- `ef-print-columns` becomes one column.
- `ef-print-sidebar` becomes one stacked column.

These rules are screen-only. Under print media, the authored column count and side-rail layout remain unchanged.

The other registered Folio primitives use natural block flow and must not gain unnecessary mobile-specific layout rules.

## Canonical report example

The generated site publishes `reports/signal-results/` from the canonical fixture at `tests/fixtures/reports/signal-results.html`.

The example:

- uses the actual Folio print stylesheet;
- contains no browser JavaScript in the generated documentation artifact;
- demonstrates Letter/A4-compatible composition, result integrity, report metrics, findings, chart accessibility fallback, distributions, landscape comparison, and provenance;
- remains a consumer example, not a Signal runtime dependency;
- must stay synchronized with `docs/recipes/SIGNAL-RESULTS-REPORT.md`.

## Recipes and the professional-profile family

The generated site publishes one page per public recipe under `recipes/<slug>/` from `tools/recipe-metadata.mjs`, each with at least three standalone demos under `demos/recipe-<slug>/`. The generator fails if a recipe has fewer than three examples.

`profiles/` publishes the Resume / Professional Profile family: `RESUME-01`, `RESUME-02`, and `PROFILE-03` from `tests/fixtures/profiles/`. Each page shows the rendered preview, semantic source, primitives and recipes used, page dimensions, capability tier, renderer limitations, and mobile behavior. Previews use the actual Folio stylesheet plus the fixture's consumer stylesheet, contain no browser JavaScript, and must stay synchronized with `docs/recipes/PROFESSIONAL-PROFILE.md`.
