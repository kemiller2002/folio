# Echelon Runtime Version Stamp — Folio input

Status: proposed source input for Praxis.
Stable requirement: `RQ-FOLIO-2026-A001`.
Shared contract: `ECHELON-RUNTIME-1`.

## Objective

When Folio's browser module is loaded, expose the actual distributed Folio
version through `window.__ECHELON_RUNTIME__` and a concise production console
diagnostic without adding text or layout to a printed document.

## Functional and compatibility requirements

- Register `libraries.folio.version` under schema version 1 independently of
  Forma, Limen, load order, and load timing.
- Compatible duplicate registration is silent. A conflicting version warns
  and preserves the first registration.
- The default component entry point and the explicit runtime entry point both
  support the contract without duplicate warnings.
- Print fixtures, preview documents, page geometry, and print output remain
  script-free and unchanged. Documentation chrome may load the diagnostic.
- Only allow-listed metadata is retained; arbitrary environment values and
  secrets are excluded.

## Build, acceptance, and machine verification

Generate Folio's version constant from `package.json`, check it during tests
and packaging, and copy the production modules into the documentation build.
Playwright must read the registry in the existing Chromium, Firefox, and WebKit
site matrix and compare it to package metadata. Unit coverage must exercise
repetition, order, combined libraries, conflict preservation, and metadata
allow-listing. Existing print and layout checks must continue to pass.
