---
id: RQ-FOLIO-2026-A001
title: Browser runtime version reporting
status: accepted
version: 1.0.0
owners: [folio-maintainers]
created: 2026-10-21
updated: 2026-10-21
priority: high
related_documents:
  - docs/requirements/PRINT-COMPONENTS-REQUIREMENTS.md
  - docs/requirements/MACHINE-OPERABILITY.md
  - tests/runtime-version.test.mjs
  - tests/run-site-browser-tests.mjs
tags: [runtime-metadata, versioning, print, diagnostics, machine-operability]
provenance:
  contributions:
    EXE-20261021T081649598Z-ebab413c:
      operations: [created]
      at: 2026-10-21T08:41:07.774Z
      actor:
        kind: agent
        id: openai/codex
        provider: openai
        model: unknown
        runtime: codex
      reason: "Define and implement Folio runtime version reporting without changing printed output"
---

# Browser runtime version reporting

Folio implements the shared `ECHELON-RUNTIME-1` browser contract without a
shared package and without inserting version content into printed documents.

## Functional behavior

1. Loading Folio's public component entry point or explicit runtime entry point
   MUST create or reuse `window.__ECHELON_RUNTIME__` with `schemaVersion: 1`
   and register `libraries.folio`.
2. `libraries.folio.version` MUST equal the distributed npm artifact version
   that is executing. Optional `commit` and `buildTime` fields MAY be absent.
3. Registration MUST be independent, idempotent, asynchronous-safe, and order-
   insensitive. Compatible duplicates MUST be silent. Conflicts MUST warn and
   MUST preserve the first registration.
4. A new registration MUST emit one concise production console diagnostic.
   Structured registry data is authoritative.
5. The registry MUST retain only `version`, `commit`, and `buildTime`; it MUST
   NOT expose credentials, environment variables, or arbitrary caller fields.

## Compatibility expectations

- Existing browser component registration and package imports MUST continue to
  work without new production dependencies.
- Print fixtures and standalone previews MUST remain script-free. No version
  text, registry script, or console presentation may alter printed content,
  pagination, page layout, or renderer behavior.
- Documentation chrome MAY load the runtime module so deployed examples expose
  Folio metadata while their print-preview frames remain unchanged.
- Forma, Folio, Limen, and future lowercase library names MUST coexist in one
  registry regardless of loading order.

## Build and release integration

The version constant MUST be generated from `package.json` and checked by the
normal test and package gates. The site build MUST copy the same production
modules shipped by npm. A manually maintained duplicate version or clock-based
artifact value is not permitted.

## Acceptance criteria and verification

- Node tests compare the generated constant to the package manifest and cover
  duplicate, reverse-order, multi-library, conflict, and allow-list behavior.
- Playwright reads `window.__ECHELON_RUNTIME__` from the production site build
  in Chromium, Firefox, and WebKit and compares the Folio entry to package
  metadata.
- Site tests prove only documentation index pages load the diagnostic and all
  printable demo/preview documents remain script-free.
- Existing print experiment, layout, accessibility, machine-operability, and
  package checks pass, with evidence attached to `WI-0011`.

## Machine-operability

Automation MUST read the structured registry. Console text MUST NOT be parsed
as the version interface.
