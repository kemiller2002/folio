---
id: PROJECT-CHARTER-echelon-print-components
title: Echelon Print Components Project Charter
status: active
version: 0.2.0
created: 2026-09-22
updated: 2026-09-22
---

# Echelon Print Components project charter

## Purpose

Create an installable, standards-first set of web components, print CSS, themes,
and renderer contracts that let applications build professional HTML documents
with a consistent look and feel for paper and PDF output.

The project should make difficult print-document behavior reusable without
turning the component library into a second browser layout engine.

## Intended users

- Echelon Foundry applications that need reports, research documents, proposals,
  invoices, decision memos, manuals, handouts, or other printed/PDF output.
- Other web applications that want framework-independent printable document
  primitives.
- Engineers who need deterministic browser-to-PDF output without coupling their
  application to a full publishing framework.

## First bounded outcome

Deliver one canonical document and the smallest reusable component/theme surface
that can produce it.

The canonical document must exercise title and back pages, named page profiles,
page artwork, two-column content, a side panel, figures, a multipage table, code,
a landscape section, explicit page breaks, and Chromium Page X of Y output,
while retaining all meaningful content in the portable-browser fallback.

## Included

- Semantic light-DOM web components for print/layout intent.
- Professional default typography and visual tokens.
- Letter and A4 page profiles, portrait and landscape.
- Title, body, back, and wide/named page profiles.
- Header/footer/page-number intent with explicit renderer capability.
- Multi-column layouts and in-flow side panels.
- Page art/background/watermark patterns.
- Print-safe tables, figures, code, callouts, notes, and TOC structure.
- Descriptive object metadata presentation/export boundaries with explicit source-only/rendered/provenance/accessibility handling.
- Workflow/diagram paged-media projection, authored color preservation, grayscale/backgrounds-disabled fallbacks, and fit/tiling contracts.
- Deterministic Chromium PDF export as a separate adapter/tool boundary.
- Browser/renderer conformance research and tests.
- Accessibility constraints for source HTML and preview UI.
- Optional research into enhanced paged-media engines.

## Excluded from the first release

- A word processor or WYSIWYG page editor.
- A JavaScript reimplementation of general-purpose pagination.
- Pixel-identical output across every browser and printer.
- CMYK/prepress guarantees from ordinary browser printing.
- Browser-native bleed/crop-mark claims where browsers do not implement them.
- A guarantee that browser-generated PDFs are PDF/UA tagged without a separately
  validated renderer.
- Business/domain logic inside presentation components.
- Graph/workflow routing, execution, topology ownership, or diagram editor behavior.
- A bundled charting system.

## Success criteria

- A clean consumer can install the package and create the canonical document.
- Basic document output remains meaningful with JavaScript disabled.
- Deterministic Chromium PDF output has no clipped/missing content in canonical fixtures.
- Firefox and Safari/WebKit portable output retain all meaningful content even
  when Chromium-only page-margin boxes are unavailable.
- Public renderer differences are documented rather than hidden.
- Page layout is driven by CSS/paged-media semantics rather than DOM-height pagination.
- Theme overrides do not require modifying package source.
- Core remains framework independent and low dependency.
- Material browser/renderer claims have a dated fixture or source.
- ROS/SDE/Visual Engineering/Communication Engineering/Limen verification stays green.

## Constraints and assumptions

- Standards-first implementation and minimal runtime dependencies.
- Semantic HTML/source order is authoritative.
- Core printable content uses light DOM unless an experiment proves a stronger alternative.
- Browser print settings remain partly controlled by the user; deterministic output
  requires a controlled renderer path.
- Chromium-specific page-margin features must not be described as portable.
- Advanced publishing capabilities belong behind explicit adapters.
- Print content and application data are not transmitted or persisted by the core library.

## Owners and decision authority

Project owner: repository owner.

Public API, renderer capability contracts, and dependency additions are
costly-to-reverse decisions and require explicit repository decision records.
