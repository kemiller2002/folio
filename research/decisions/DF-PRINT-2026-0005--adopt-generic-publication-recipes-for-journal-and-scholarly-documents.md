---
id: DF-PRINT-2026-0005
title: Adopt generic publication recipes, not journal elements, for scholarly articles and issues
status: accepted
type: decision-record
created: 2026-10-01
updated: 2026-10-01
tags: [architecture, recipes, journal, scholarly, public-api, renderer-capability]
supersedes: []
superseded_by: []
related_documents:
  - research/decisions/DF-PRINT-2026-0004--adopt-stylesheet-recipes-for-professional-profile-layout.md
  - research/hypotheses/HY-PRINT-2026-0009--semantic-html-plus-publication-recipes-compose-scholarly-articles-and-issues.md
  - research/evidence/EV-PRINT-2026-0007--journal-fixture-portable-and-chromium-evidence.md
  - research/evidence/EV-PRINT-2026-0008--journal-enhanced-01-vivliostyle-comparison.md
  - docs/recipes/JOURNAL-PUBLICATION.md
---

# DF-PRINT-2026-0005

## Context

Issue #28 asks Folio to produce standalone scholarly articles and complete
multi-article journal issues for screen, browser print, and deterministic PDF
without creating a proprietary journal format, a pagination engine, or a
citation engine. The issue proposed provisional class names (`.ef-journal`,
`.ef-article-header`, `.ef-authors`, `.ef-keywords`, `.ef-running-meta`,
`.ef-journal-masthead`, `.ef-journal-toc`, ...). Each was tested against four
questions: is it a reusable layout contract; can native HTML already express
the meaning; is a recipe sufficient; would an element add real layout
semantics.

A Chromium 141 probe (recorded in `EV-PRINT-2026-0007`) established the P1/P2
boundary: continuous `counter(page)`/`counter(pages)` across named pages,
static margin-box content per named page, named landscape pages, and
`column-span: all` work; `@page name:first` for the first page of a named-page
group, `string-set`, `target-counter()`, `float: footnote`, recto/verso
breaks, and `bleed` do not.

## Decision

1. **Recipes over elements.** No new custom elements. Scholarly meaning stays
   in native `article`, `header`, `section`, `figure`, `table`, `math`, `ol`,
   `dl`, `address`, `cite`, `time`, and links.
2. **Generic names.** Thirteen recipes are added to the `ef-print-recipes`
   layer, named for the layout contract rather than the journal domain so
   reports, proceedings, books, and manuals can use them:
   `.ef-longform` (long-form reading rhythm; replaces provisional
   `.ef-journal`), `.ef-article` (article/chapter unit and its start-on-page
   intent), `.ef-article-header` (opening front matter), `.ef-authors`,
   `.ef-affiliations`, `.ef-meta-list` (generic label/value metadata list;
   also satisfies `EPC-OBJMETA-007`), `.ef-abstract` (plain and structured),
   `.ef-caption` (label, note, and source for figures, tables, equations),
   `.ef-equation`, `.ef-column-span`, `.ef-reference-list` (numeric and
   hanging), `.ef-endnotes`, and `.ef-declarations`.
3. **Reuse instead of new names.**
   - `.ef-keywords` → `.ef-labeled` + `.ef-inline-list` (already a label/value
     inline collection).
   - `.ef-journal-masthead` → `.ef-category-grid` for editorial-board groups
     and `.ef-meta-list` for publisher/legal facts.
   - `.ef-journal-toc` → `ef-print-toc`, gaining one generic extension: a
     `[data-detail]` child (authors, article type) placed beneath the title.
   - `.ef-running-meta` → `ef-print-header`/`ef-print-footer` for in-flow
     opening furniture; physical running heads are renderer-owned `@page`
     margin boxes authored by the consumer.
   - `.ef-author-note` → `ef-print-note`.
   - `.ef-journal`, `.ef-journal-issue`, `.ef-journal-issue-header` → issue
     composition of `ef-print-document`, `ef-print-title-page`,
     `ef-print-section`, `.ef-article`, and `ef-print-back-page`; no
     issue-specific recipe is needed.
4. **Authored numbering.** Section, figure, table, equation, reference, and
   page-range numbers are consumer text. Folio styles labels; it does not
   generate them with CSS counters (`FOLIO-JRN-253`).
5. **Citation, math, and metadata boundaries.** CSL processing, JATS
   conversion, bibliographic validation, DOI registration, and math
   typesetting stay upstream. Folio lays out MathML Core, accessible HTML, or
   SVG supplied by the consumer and adds no math runtime.
6. **Renderer-owned pagination.** Continuous issue numbering is the
   renderer's `counter(page)`. Per-article running heads at P1 use one named
   page per article with consumer-authored margin-box content, which forces a
   page break at each article boundary. Running strings, first-page
   suppression for named-page groups, target-page references, true
   footnotes, recto starts, and bleed/marks remain P3 until an adapter
   decision is accepted.
7. **Enhanced renderers stay out of tree.** JOURNAL-ENHANCED-01 compares a P3
   engine (Vivliostyle, the research-posture candidate) using an out-of-tree
   install. No enhanced-renderer package enters `package.json`.

## Rejected alternatives

- `ef-print-journal`, `ef-print-article`, `ef-print-author`,
  `ef-print-abstract`, `ef-print-reference`: domain meaning in core, and
  wrappers around native semantics that add no layout contract.
- CSS-counter auto-numbering of figures/sections/equations in core:
  generated numbers diverge from consumer cross-reference text and vanish
  from some extraction paths.
- A JavaScript footnote or "see page N" engine: DOM measurement and
  repagination, prohibited by `DF-PRINT-2026-0001`.
- A `.foliojournal` source format or JATS ingestion in core: HTML remains the
  publication artifact; converters are upstream.
- Adding Vivliostyle as a devDependency now: no adapter decision exists and
  the P3 evidence is a single comparison.

## Consequences

Folio's public surface grows by thirteen stylesheet contracts and one
`ef-print-toc` child convention. Each recipe carries capability/maturity
metadata, three site examples, and fixture evidence. Journal house styles
(page size, type families, running-head text, cover art) remain consumer CSS.
First-page suppression of running heads inside an issue is not available in
Chromium; consumers who need it select a P3 renderer and accept its
evidence boundary.
