# Folio Machine-Operability Contract

Status: required baseline  
Date: 2026-10-02  
Reference automation: Playwright  
Applies to: Folio public document primitives, generated HTML, documentation/preview interactions, and interactive configuration surfaces that consume Folio

## 1. Principle

Folio output must remain semantically inspectable by machines, and every interactive surface around Folio must be operable through the same kind of deterministic semantic browser contract required by Forma.

Folio MUST NOT turn meaningful document structure into an opaque visual surface merely to make it look correct. A machine must be able to identify important document objects, inspect their state/content, follow links and relationships, and operate any supported interactive preview/configuration action without visual guessing.

Playwright is the reference conformance tool, not the architecture.

## 2. Relationship to Forma

Interactive preview and configuration UI SHOULD use Forma patterns and inherits Forma's machine-operability rule:

- role and accessible name are preferred machine locators;
- native identity and relationships are preferred over implementation selectors;
- direct manipulation must have a non-coordinate semantic equivalent for meaningful state changes;
- completion must be observable without fixed sleeps;
- machine actors use the same Limen/application and Ordo/domain rules as human actors.

Folio itself remains a document-intent layer. It does not gain domain behavior, pagination logic, or a privileged automation API.

## 3. Requirements

### FOL-MO-001 Semantic source remains authoritative

Headings, paragraphs, lists, tables, figures, links, sections, and other meaningful document structure MUST use native semantic HTML wherever that meaning exists in HTML.

### FOL-MO-002 Light DOM remains inspectable

Core Folio primitives MUST preserve their meaningful child content in light DOM. Required document content MUST NOT be hidden behind closed Shadow DOM.

### FOL-MO-003 Stable identity is preserved

When a consumer supplies a stable native `id`, URL/hash target, or documented object identifier, Folio MUST preserve it through custom-element upgrade, screen preview, and print styling.

Folio MUST NOT replace stable identity with layout position, generated CSS classes, page number, or transient renderer coordinates.

### FOL-MO-004 Printed meaning is not image-only

Meaningful text, table data, labels, links, and document relationships MUST NOT be flattened into raster images as the normal output path.

A diagram or other visual projection SHOULD preserve vector/semantic structure and MUST provide a structured or textual equivalent when the graphic alone cannot carry the meaning accessibly or machine-readably.

### FOL-MO-005 Interactive previews are semantic

Any Folio-owned documentation, preview, or configuration action MUST be reachable through semantic browser controls with accessible names.

### FOL-MO-006 No coordinate-only interaction

A meaningful preview/configuration action MUST NOT require hard-coded screen coordinates, image recognition, hover-only behavior, or pointer-only behavior.

### FOL-MO-007 Observable state and completion

Interactive state MUST be observable through native state, valid ARIA, text/status output, navigation, or documented public application state. Fixed timing sleeps are not valid completion evidence when an observable state exists.

### FOL-MO-008 Pagination is not interaction state

Physical page placement, page count, and fragmentation remain renderer outputs. Automation MUST NOT infer document-domain meaning or action legality from page coordinates.

### FOL-MO-009 Machine actors do not bypass application authority

When Folio is used inside an interactive application, machine actions MUST pass through the same Limen/application behavior and Ordo/domain legality checks as human actions.

### FOL-MO-010 Tool neutrality

The contract MUST remain usable by Playwright, WebDriver/Selenium, accessibility tools, AI browser agents, and future automation systems.

### FOL-MO-011 Compatibility

Established semantic identity, document relationships, and interactive machine paths are public compatibility surfaces. Removing or materially changing them requires migration treatment.

## 4. Reference conformance

Folio's machine-operability suite MUST demonstrate at minimum that:

- semantic headings can be located by role and accessible name;
- native tables preserve their semantic name and structure;
- figures/images expose machine-readable accessible names;
- native links can target stable document IDs;
- consumer-supplied IDs survive the passive custom-element upgrade;
- registered Folio custom elements remain light-DOM containers;
- the checks run in Chromium, Firefox, and WebKit where Playwright exposes equivalent DOM behavior.

Renderer-specific PDF semantics remain a separate evidence problem and MUST NOT be inferred solely from DOM conformance.

## 5. Definition of done

For document output, a machine must be able to answer:

1. What semantic object is this?
2. Which stable object or target is it?
3. What meaningful content or relationship does it expose?

For an interactive preview/configuration action, it must additionally be able to answer:

4. What actions are available?
5. How is the action invoked without visual guessing?
6. How do I know it succeeded, failed, or was rejected?

If the relevant questions cannot be answered through the public document/interaction contract, the feature is not complete.

## 6. CI gate

Machine-operability conformance MUST run as part of Folio's normal test gate. A regression in semantic document structure, stable identity, or an established interactive machine path blocks merge/release unless the public contract is intentionally versioned with migration guidance.
