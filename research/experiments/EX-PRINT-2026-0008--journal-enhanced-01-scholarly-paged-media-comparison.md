---
id: EX-PRINT-2026-0008
title: JOURNAL-ENHANCED-01 scholarly paged-media comparison
research_area: print-components
status: completed
created: 2026-10-01
author_agent: claude-code
tests_hypotheses:
  - HY-PRINT-2026-0010
related_theories: []
inputs:
  - tests/fixtures/journal/enhanced-01.html
  - tests/fixtures/journal/enhanced.css
  - tests/fixtures/journal/article-01.html
  - tests/fixtures/journal/issue-01.html
outputs:
  - test-results/journal-enhanced/results.json
  - test-results/journal-enhanced/chromium-enhanced-01.pdf
  - test-results/journal-enhanced/vivliostyle-enhanced-01.pdf
---

# Experiment

## Research question

Which scholarly publishing features that Chromium lacks (FOLIO-JRN-256) does an
optional enhanced renderer provide from the same semantic source, and does the
portable fallback stay complete?

## Hypotheses tested

HY-PRINT-2026-0010.

## Method

Render the three journal fixtures with deterministic Chromium and with
Vivliostyle (out-of-tree install, same host browser). Compare letter and word
conservation against the Chromium DOM text, then extract page sizes, footnote
positions, target-page text, running-head lines, opening pages, blank pages,
and figure placement from the PDFs.

## Acceptance criteria

- No authored words are lost in either renderer.
- Chromium shows notes in flow, no target-page numbers, no simulated footnotes.
- Each enhanced feature is recorded as observed or not observed.

## Falsification criteria

Content loss, a Chromium fabrication, or an enhanced feature claimed without an
observation.

## Controls

The same HTML and CSS feed both renderers; only the renderer changes. The
portable fixtures act as controls for content conservation.

## Procedure

`VIVLIOSTYLE_CLI=… VIVLIOSTYLE_BROWSER=… npm run experiment:journal-enhanced`.

## Results

Completed 2026-10-01. See EV-PRINT-2026-0008: footnotes, target pages, running
strings with `first-except`, recto/blank pages, `@page :blank`, and bleed/marks
observed under Vivliostyle 2.45.1; `:nth()` page selectors and `float-defer`
not honoured; the page float preceded the article title. No content lost in
either renderer.

## Analysis

The P3 tier is real for most scholarly running matter and notes. A Vivliostyle
adapter decision would still need: per-article footnote counter reset, a float
policy that respects article openings, PDF tagging evidence, and a pinned
renderer version.

## Threats to validity

Single run, small fixture, Chromium 141 host; CI does not run this experiment.

## Replication notes

The runner calls the renderer asynchronously because the same process serves the
fixtures; a synchronous call deadlocks the HTTP server.
