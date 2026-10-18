---
id: RQ-FOLIO-DBC-001
title: Design by Construction for paged output
status: draft
version: 1.0.0
owners: [folio-maintainers]
created: 2026-10-18
updated: 2026-10-18
priority: critical
related_documents:
  - docs/requirements/PRINT-COMPONENTS-REQUIREMENTS.md
  - docs/requirements/MACHINE-OPERABILITY.md
tags: [design-by-construction, print, contracts, accessibility]
derived_from: [INPUT-f29d2290b1bd31e4]
provenance:
  contributions:
    EXE-20261018T124842412Z-443641b9:
      operations: [created]
      at: 2026-10-18T12:53:00.522Z
      actor:
        kind: agent
        id: openai/codex
        provider: openai
        model: unknown
        runtime: codex
      reason: "Canonical ingestion of claimed requirement source"
---

# Design by Construction for paged output

This draft canonically ingests the Design by Construction source for Folio.
Ingestion does not approve a design or prove implementation.

## Objective and repository scope

Prevent known classes of invalid UI and print designs structurally rather than
depending primarily on post-hoc visual inspection and testing. Folio MUST
extend shared semantic design contracts for pagination, heading
keep-with-next, widow/orphan handling, tables, captions, safe areas,
typography, and print output while preserving interoperable HTML and CSS.

## Shared requirements

1. Use a versioned machine-readable design contract with explicit compatibility rules.
2. Standard mode constrains semantic layout, alignment, overflow, typography, color, accessibility, motion, and action semantics.
3. Extended mode permits documented semantic overrides; custom mode requires a reason and additional validation evidence.
4. Preserve ordinary HTML/CSS and accessible web semantics; a proprietary designer format MUST NOT be mandatory for consumers.
5. Reject structurally invalid compositions before code generation with actionable error messages.
6. Preserve backward compatibility or provide a documented, versioned migration path.
7. Ensure interactive controls are keyboard- and Playwright-operable and commands have observable meaningful behavior.
8. Treat runtime and visual testing as evidence for properties that contracts cannot guarantee.

## First end-to-end slice

A customer form containing two fields, email validation, a real save command,
and responsive layout. The contract MUST prevent misaligned standard fields,
unsupported layout overrides, missing action bindings, and invalid parent-child
compositions. Verification MUST cover narrow/mobile and desktop viewports and
reduced motion.

## Expressiveness and flexibility

- Support composable stack, grid, split, dock, flow, canvas, overlay, page, and repeater models where applicable; irrelevant renderers need not implement every model.
- Apply context-specific invariants: standard forms align fields, canvases permit deliberate free positioning/overlap, and print pages enforce pagination and safe areas.
- Allow nested compositions, responsive container-based adaptation, dense/comfortable modes, themes, and white labeling.
- Do not hard-code one visual arrangement, navigation pattern, or form column count as universal.
- Support declarative data binding, computed values, validation, conditional visibility, state-dependent commands, and asynchronous feedback where applicable.
- Support appropriate drag/drop, reordering, resizing, docking, virtualization, keyboard navigation, and Playwright-operable interactions.
- Provide documented extension points for charts, diagrams, maps, photography, and specialized content without bypassing semantic or safety contracts.
- Distinguish hard structural constraints from subjective design guidance; unsupported but legitimate designs require a documented, auditable extension path.

## Reference-layout certification

- Maintain a cross-repository reference suite of at least 20 diverse layouts, including dashboard, complex form, mobile wizard, financial ledger, calendar, kanban board, workflow editor, marketing page, article, resume, menu, business card, and journal publication.
- Record required capabilities, rendering modes, accessibility and machine-operability evidence, and custom overrides for every reference.
- Proposed targets, to be validated rather than assumed, are 100% representability through documented APIs, 100% rejection of defined invalid structural fixtures, and fewer than 10% of references requiring custom exceptions.
- Measure agent effort, escape-hatch use, regressions, and visual quality separately. Visual taste remains reviewable guidance, not an arbitrary compile failure.

## Acceptance evidence

- Versioned schema and supported/unsupported examples.
- Deterministic, specific diagnostics for invalid fixtures.
- Correct desktop and mobile output for valid fixtures.
- Keyboard, screen-reader, and Playwright evidence.
- Regression and migration tests with measured escape defects and correction effort.
- Repository-local work and provenance linked to this requirement.

## Dependencies and execution

Contract/schema owners MUST agree on layout taxonomy and compatibility before
consumer enforcement. Coordinate Forma contract first, then Forma Studio and
Ordo integration, Praxis guidance, Visual Engineering evidence, and Folio
extensions. Visual Engineering owns certification evidence. Implementation
MUST use narrow validated slices and MUST NOT be claimed complete before its
evidence is committed.
