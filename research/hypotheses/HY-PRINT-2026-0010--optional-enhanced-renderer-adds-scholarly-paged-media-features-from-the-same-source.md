---
id: HY-PRINT-2026-0010
title: An optional enhanced paged-media renderer adds scholarly P3 features from the same semantic source without changing portable output
research_area: print-components
status: supported
confidence: low
created: 2026-10-01
author_agent: claude-code
supporting_evidence:
  - EV-PRINT-2026-0008
contradicting_evidence: []
related_theories: []
supersedes: []
superseded_by: []
---

# Hypothesis

## Statement

A consumer stylesheet that uses standard and draft paged-media features (true
footnotes, running strings, target counters, page floats, recto starts, blank
pages, bleed and marks) produces those features under an optional enhanced
renderer, while mainstream browsers drop the declarations and keep all content
readable in flow, so one semantic source serves P0/P2 and P3.

## Predictions

- Chromium loses no words and invents no target-page numbers or footnotes.
- The enhanced renderer places notes at the page foot, prints target pages,
  sets running strings, suppresses them on article openings, starts articles on
  recto pages, and enlarges the page box for bleed and marks.
- The enhanced renderer improves float placement for scholarly openings.

## Falsification

Content loss in either renderer, a fabricated feature in Chromium, or absence
of the enhanced features under the enhanced renderer.

## Status note

Supported for footnotes, target pages, running strings with `first-except`,
recto/blank pages, and bleed/marks; the float prediction failed (EV-PRINT-2026-0008).
P3 features remain experimental and are not Folio promises.
