# Unbound financial reporting consumer capability review (proposed)
Date: 2026-11-23. No implementation, PDF renderer test or conformance certification.

Unbound intends to reuse Folio's print primitives and renderer capability tiers for statements, board packs, grant/compliance reports and operational reports. Folio's README documents implemented ef-print components and P0/P1/P2/P3 tiering; this is not evidence that archival accessible financial PDFs are production-qualified.

## Validation matrix
- Realistic multipage financial tables with subtotal, currency, negative numbers, footnotes, disclosures and running headers/footers.
- Pagination overflow, repeated headings, landscape sections, mixed page sizes, orphan prevention and grayscale/background-disabled print.
- Deterministic P2 Chromium PDF with pinned fonts, renderer, locale, timezone, assets and configuration; validate byte-level versus semantic repeatability.
- Tagged PDF accessibility, PDF/A archival compliance, metadata and cryptographic signatures: investigate, do not assume Folio provides these.
- Immutable as-issued artifact integration: final PDF SHA-256 outside the bytes, revision/correction history, evidence manifest, legal holds and seven-year financial floor are Unbound responsibilities.
- Typst comparative ADR: Folio HTML and Typst do not have demonstrated direct interoperability; evaluate adapters/parallel renderer only with proof.
- Visual authoring through Forma Studio is separately gated, with exact Folio version and public components.
## Gates
Create reference fixtures and automated visual/semantic checks before designating a renderer production-ready. Do not silently degrade unsupported page features.
