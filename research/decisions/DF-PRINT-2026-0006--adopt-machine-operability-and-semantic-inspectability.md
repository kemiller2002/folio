---
id: DF-PRINT-2026-0006
title: Adopt machine operability and semantic inspectability as public Folio contracts
status: accepted
date: 2026-10-02
work_item: FOLIO-GH-33
related:
  - docs/requirements/MACHINE-OPERABILITY.md
  - docs/AGENT-USAGE.md
  - tests/run-machine-operability-tests.mjs
---

# Context

Folio already uses semantic HTML, passive light-DOM custom elements, and standards-first print CSS. That architecture is naturally inspectable by browser automation, but the repository did not explicitly treat machine operability as a compatibility requirement.

Without an explicit rule, future preview tooling or document features could drift toward opaque canvases, image-only output, DOM-position selectors, coordinate-driven tests, or fixed waits even while preserving visual appearance.

# Decision

Folio adopts machine operability and semantic inspectability as public contracts.

Generated HTML keeps semantic native structure wherever HTML expresses the meaning. Consumer-supplied stable identity is preserved. Core print primitives remain light-DOM containers. Interactive preview/configuration UI follows the Forma machine-operability model and must expose semantic actions and deterministic completion.

Playwright is the reference conformance tool, but no Playwright-specific production API is introduced.

Folio does not become an application runtime. Limen/application code still owns non-native interaction behavior; Ordo/application domain state still owns legality; the renderer still owns physical pagination.

# Consequences

- A visually correct document that destroys semantic source structure is not complete.
- Image-only output is not the normal representation for meaningful text, tables, labels, or relationships.
- Preview/configuration automation cannot rely on hard-coded coordinates or implementation-only selectors.
- Stable IDs and semantic relationships become compatibility surfaces.
- DOM conformance does not, by itself, prove equivalent PDF accessibility semantics; renderer/PDF evidence remains separate.

# Rejected alternatives

## Treat automation as test-only infrastructure

Rejected because that permits production semantic contracts to regress while tests compensate with private selectors.

## Add a privileged Folio automation API

Rejected because Folio should remain a document-intent layer and must not bypass application/domain authority.

## Flatten output for deterministic visuals

Rejected because deterministic appearance is not worth discarding semantic inspectability, accessibility, text extraction, or downstream machine use.

# Validation

`tests/run-machine-operability-tests.mjs` uses Playwright in Chromium, Firefox, and WebKit to verify semantic role/name discovery, stable native targets, passive custom-element upgrade, and light-DOM preservation.
