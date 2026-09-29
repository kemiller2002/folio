# Folio

**Folio** is the Echelon Foundry print component system: reusable, installable web components and print-layout primitives for building professional documents in HTML and printing them to paper or PDF with a consistent visual system.

The project is **standards first**: semantic HTML and CSS express document and pagination intent, while renderer-specific capabilities are explicit. The goal is not to build a second pagination engine in JavaScript.

## Current status

Requirements, architecture research, renderer experiments, and the expanded passive light-DOM core component surface are established.

Installed engineering foundation:

- Repository Operating System (ROS) 3.1.4
- State-Directed Engineering / Ordo (SDE) 1.3.0
- Visual Engineering 1.0.0
- Communication Engineering 1.0.0 operational context
- Limen 0.6.2

## Architecture direction

Core output will use light-DOM custom elements, semantic HTML, print CSS, design tokens, named pages, native fragmentation, and CSS multi-column layout.

Renderer capability is intentionally tiered:

- **P0 Portable browser:** common modern-browser print behavior.
- **P1 Chromium margin boxes:** repeated margin headers/footers plus current/total page counters.
- **P2 Deterministic Chromium:** controlled automated PDF export.
- **P3 Enhanced paged media:** optional publishing-engine capabilities such as richer running content, automatic footnotes, target page counters, sidenotes, bleed, and crop marks.

Limen is installed for a future interactive preview/configuration application. It is not intended to become the pagination engine.

## Start here

- [Comprehensive requirements](docs/requirements/PRINT-COMPONENTS-REQUIREMENTS.md)
- [Architecture](docs/architecture/PRINT-ARCHITECTURE.md)
- [Web print capability baseline](docs/research/PRINT-WEB-CAPABILITY-BASELINE-2026-09.md)
- [Project charter](PROJECT-CHARTER.md)
- [Current state](context/CURRENT-STATE.md)
- [Research queue](context/RESEARCH-QUEUE.md)

## First vertical slice

The first implementation must exercise difficult print behavior rather than a trivial component demo: title page, page art, normal body pages, repeated Chromium header/footer with Page X of Y, portable fallback, two-column content, side panel, multipage table, code block, landscape section, and back page, with deterministic PDF tests.


## Implemented component slice

The currently registered Folio components are:

- `ef-print-document`
- `ef-print-title-page`
- `ef-print-section`
- `ef-print-back-page`
- `ef-print-header`
- `ef-print-footer`
- `ef-print-page-number`
- `ef-print-columns`
- `ef-print-sidebar` (provisional portability posture)
- `ef-print-layer`
- `ef-print-break`
- `ef-print-keep`
- `ef-print-metric`
- `ef-print-integrity`
- `ef-print-finding`
- `ef-print-callout`
- `ef-print-figure`
- `ef-print-table`
- `ef-print-code`
- `ef-print-toc`
- `ef-print-note`

The package identifier remains `@echelon-foundry/print-components`. Version 0.2.0 expands the public primitive surface while preserving zero runtime dependencies and CSS-first behavior.

## Folio documentation site

Build the generated Folio site with:

```bash
npm run site:check
```

Run the documentation browser checks after installing Playwright browsers:

```bash
npm run site:test:browser
```

The generated artifact is written to `site-dist/` and is not committed.

Agent usage rules are in [docs/AGENT-USAGE.md](docs/AGENT-USAGE.md).

## Canonical results-report composition

Folio now includes a canonical Signal consumer fixture at `tests/fixtures/reports/signal-results.html` and a generated documentation example at `reports/signal-results/`.

The fixture proves a substantial results document using existing Folio primitives plus three report-specific presentation contracts: `ef-print-metric`, `ef-print-integrity`, and `ef-print-finding`. Scoring, privacy, comparability, confidence, and recommendations remain application-owned. See `docs/recipes/SIGNAL-RESULTS-REPORT.md`.

## Professional profile / resume family

Folio reproduces a real two-variant resume and a generalized professional profile from semantic HTML plus stylesheet recipes in the public `ef-print-recipes` layer: `.ef-identity`, `.ef-row` with `[data-row-end]`, `.ef-entry`, `.ef-lead-list`, `.ef-inline-list`, `.ef-labeled`, `.ef-category-grid`, and `.ef-dense`. No resume-specific elements exist. Fixtures live in `tests/fixtures/profiles/`; the generated site shows them under `profiles/`. See `docs/recipes/PROFESSIONAL-PROFILE.md`.
