# Echelon Print Components Requirements

Status: initial comprehensive requirements baseline  
Date: 2026-09-22  
Package target: `@echelon-foundry/print-components`

## 1. Product intent

Echelon Print Components is a standards-first set of installable web components, CSS primitives, themes, and renderer adapters for producing professional HTML documents that can be printed to paper or exported to PDF. Applications own document data and meaning. This library owns reusable document presentation contracts.

The system is deliberately not a JavaScript pagination engine. It expresses document and pagination intent in semantic HTML and CSS, uses browser-native paged-media behavior wherever it is reliable, and exposes enhanced renderer capabilities explicitly when native browsers cannot provide a feature consistently.

### General requirements

- **EPC-GEN-001 MUST** allow an application to construct a professional printable document from ordinary HTML plus reusable package primitives.
- **EPC-GEN-002 MUST** support both direct browser printing and PDF generation workflows.
- **EPC-GEN-003 MUST** keep document content useful when JavaScript is unavailable or a custom element has not upgraded.
- **EPC-GEN-004 MUST** prefer platform HTML/CSS capabilities over framework-specific abstractions.
- **EPC-GEN-005 MUST NOT** require React, Vue, Angular, Lit, or another UI framework.
- **EPC-GEN-006 MUST** be consumable by framework-based applications without adapters for basic use.
- **EPC-GEN-007 MUST** separate semantic content, layout intent, theme, and renderer capability.
- **EPC-GEN-008 MUST** treat print and PDF as first-class output media rather than screenshots of a screen UI.
- **EPC-GEN-009 MUST** permit branded documents without forcing a single Echelon Foundry visual theme on consumers.
- **EPC-GEN-010 MUST** provide a strong default professional theme.
- **EPC-GEN-011 MUST** allow applications to opt into only the primitives they need.
- **EPC-GEN-012 MUST** expose unsupported or renderer-specific features rather than silently approximating them in ways that change meaning.
- **EPC-GEN-013 MUST** preserve source order and semantic reading order through print layout.
- **EPC-GEN-014 MUST** favor deterministic layout rules over content-measuring JavaScript.
- **EPC-GEN-015 SHOULD** be usable for reports, proposals, technical documents, invoices, research papers, decision memos, manuals, handouts, letters, and similar paged documents.
- **EPC-GEN-016 MUST NOT** position itself as a general-purpose word processor, desktop publishing application, or WYSIWYG editor in the first release.

## 2. Package and integration contract

- **EPC-PKG-001 MUST** publish as an npm package with semantic versioning.
- **EPC-PKG-002 MUST** provide ESM exports.
- **EPC-PKG-003 MUST** provide TypeScript declarations for JavaScript-facing APIs and custom elements.
- **EPC-PKG-004 MUST** expose the core stylesheet as a stable package export.
- **EPC-PKG-005 MUST** expose themes as separate package exports so an application can avoid unused themes.
- **EPC-PKG-006 MUST** document which imports have CSS side effects.
- **EPC-PKG-007 SHOULD** have no runtime dependencies in the core package unless evidence demonstrates that a dependency materially improves correctness.
- **EPC-PKG-008 MUST NOT** require a build tool for basic use; import-map or direct ESM use must be possible.
- **EPC-PKG-009 MUST** support conventional bundlers without custom plugins.
- **EPC-PKG-010 MUST** be CSP-compatible and must not require `unsafe-eval`.
- **EPC-PKG-011 MUST NOT** perform network requests at runtime.
- **EPC-PKG-012 MUST NOT** collect telemetry.
- **EPC-PKG-013 MUST** provide a stable versioned CSS custom-property contract.
- **EPC-PKG-014 MUST** make custom-element registration idempotent.
- **EPC-PKG-015 MUST** document browser and renderer support separately from package version compatibility.
- **EPC-PKG-016 SHOULD** provide an optional Fable/F# binding surface only if it reduces friction without making F# a requirement for consumers.
- **EPC-PKG-017 MUST** keep application state and business decisions out of the print component runtime.
- **EPC-PKG-018 MUST** keep any interactive preview/configuration application state in the Limen engine boundary; browser interop belongs in the Limen kernel boundary.

## 3. Component architecture

### Recommended primitive surface

The initial public surface should center on layout/print semantics, not create a custom element for every typographic element:

- `<ef-print-document>`
- `<ef-print-title-page>`
- `<ef-print-section>`
- `<ef-print-back-page>`
- `<ef-print-header>`
- `<ef-print-footer>`
- `<ef-print-columns>`
- `<ef-print-sidebar>`
- `<ef-print-layer>`
- `<ef-print-break>`
- `<ef-print-keep>`
- `<ef-print-callout>`
- `<ef-print-figure>`
- `<ef-print-table>`
- `<ef-print-code>`
- `<ef-print-toc>`
- `<ef-print-note>`

Native `h1`-`h6`, `p`, `ol`, `ul`, `blockquote`, `figure`, `table`, `code`, `pre`, `a`, `img`, `aside`, `section`, and related semantic elements remain preferred wherever a custom layout contract is not needed.

### 0.2.0 implementation status

The complete core primitive list above is now registered and included in the package stylesheet. Shipping status does not erase capability boundaries:

- header/footer are portable in-flow primitives; repeated physical page-margin rendering remains renderer-dependent;
- page-number is a renderer-capability intent marker with authored fallback; dynamic current/total counters remain P1/P2/P3 behavior;
- artwork layers use document elements rather than unsupported portable page-box backgrounds;
- callout, figure, code, and note are passive flow wrappers with print-safe fragmentation defaults;
- table preserves native table semantics and contains wide screen inspection while print behavior stays authored/renderer-owned;
- TOC supports semantic/authored contents portably while automatic target-page counters remain enhanced-renderer behavior.

Cross-browser primitive-contract tests plus the existing MARGIN-01, ART-01, and TABLE-01 experiments are the current evidence basis. No component may be described as providing renderer behavior beyond that evidence.

- **EPC-CMP-001 MUST** use a collision-resistant prefix for all custom elements.
- **EPC-CMP-002 SHOULD** use `ef-print-` as the initial prefix.
- **EPC-CMP-003 MUST** render layout primitives in light DOM by default so document-level print CSS, semantic flow, and fragmentation remain observable and overridable.
- **EPC-CMP-004 MUST NOT** require Shadow DOM for core pagination or layout.
- **EPC-CMP-005 MAY** use Shadow DOM for isolated non-print preview controls if those controls are excluded from print output.
- **EPC-CMP-006 MUST** define display defaults for unupgraded custom elements in the package CSS so documents remain printable before JavaScript upgrade.
- **EPC-CMP-007 MUST** accept ordinary child HTML rather than requiring data objects for document content.
- **EPC-CMP-008 MUST** use attributes for small finite variants and CSS custom properties for visual tokens.
- **EPC-CMP-009 MUST NOT** reflect arbitrary application data into generated HTML without escaping.
- **EPC-CMP-010 MUST** preserve slotted/native semantics and accessible relationships.
- **EPC-CMP-011 MUST** avoid layout behavior that depends on measuring every element and assigning manual page coordinates.
- **EPC-CMP-012 MUST** allow a consumer to use the stylesheet without registering the JavaScript components when only declarative layout is required.
- **EPC-CMP-013 MUST** document each component's allowed children, attributes, CSS parts/tokens if any, fragmentation behavior, and renderer capability level.
- **EPC-CMP-014 MUST** define behavior for nested components and reject or document unsupported nesting.
- **EPC-CMP-015 MUST** avoid attaching event handlers to document content unless the feature is screen-preview-only.
- **EPC-CMP-016 SHOULD** use custom elements only where they establish a reusable document/layout contract that native HTML does not express clearly.

## 4. Document and page model

- **EPC-PAGE-001 MUST** provide a root document primitive that establishes print tokens and page defaults.
- **EPC-PAGE-002 MUST** support US Letter and A4 as first-class tested page sizes.
- **EPC-PAGE-003 SHOULD** support Legal, A3, A5, and user-defined physical page dimensions.
- **EPC-PAGE-004 MUST** support portrait and landscape orientation.
- **EPC-PAGE-005 MUST** express page dimensions in physical print units where appropriate.
- **EPC-PAGE-006 MUST** support configurable top, right, bottom, and left page margins.
- **EPC-PAGE-007 SHOULD** support logical inside/outside margins for duplex-oriented designs.
- **EPC-PAGE-008 MUST** support named page profiles.
- **EPC-PAGE-009 MUST** permit a document to switch page profile for a section, such as a landscape wide-table section.
- **EPC-PAGE-010 MUST** support a title-page profile.
- **EPC-PAGE-011 MUST** support a body-page profile.
- **EPC-PAGE-012 MUST** support a back-page profile.
- **EPC-PAGE-013 SHOULD** support a blank-page profile for recto/verso workflows.
- **EPC-PAGE-014 MUST** support forcing a page break before or after a logical section.
- **EPC-PAGE-015 MUST** allow a component to request `break-before`, `break-after`, and `break-inside` intent without exposing legacy `page-break-*` names as the primary API.
- **EPC-PAGE-016 MUST** permit page profiles to suppress headers, footers, and numbering.
- **EPC-PAGE-017 SHOULD** expose recto/verso intent as an enhanced capability rather than promise consistent native-browser support.
- **EPC-PAGE-018 MUST** separate trim/page size from content margins conceptually even if the native browser cannot implement bleed.
- **EPC-PAGE-019 MUST** define a safe-content region independent of decorative full-page artwork.
- **EPC-PAGE-020 MUST** document that crop marks and bleed are enhanced-renderer features rather than portable browser guarantees.

## 5. Title and back pages

- **EPC-COVER-001 MUST** provide a title-page primitive that can occupy a distinct named page.
- **EPC-COVER-002 MUST** allow title, subtitle, author/organization, date, classification/status, logo, and arbitrary additional content.
- **EPC-COVER-003 MUST** permit full-page artwork behind title-page content.
- **EPC-COVER-004 MUST** allow title-page numbering to be hidden while preserving the document's numbering model.
- **EPC-COVER-005 MUST** allow running headers/footers to be suppressed on title pages.
- **EPC-COVER-006 MUST** provide a back-page primitive with independent styling.
- **EPC-COVER-007 MUST** allow contact information, legal text, calls to action, logos, QR codes supplied by the application, and arbitrary final content on the back page.
- **EPC-COVER-008 MUST** permit the back page to suppress normal running headers/footers and page numbering.
- **EPC-COVER-009 SHOULD** support intentional blank inside-cover or separator pages through page profile primitives rather than hard-coded empty elements.

## 6. Running headers, footers, and page numbers

- **EPC-RUN-001 MUST** expose semantic document header and footer intent.
- **EPC-RUN-002 MUST** distinguish a one-time document header/footer from a running page-margin header/footer.
- **EPC-RUN-003 MUST** support left, center, and right header/footer regions where the renderer can place them.
- **EPC-RUN-004 MUST** support static text, document metadata, and logos in running regions when the active renderer permits them.
- **EPC-RUN-005 MUST** support a current page number in the Chromium margin-box capability profile.
- **EPC-RUN-006 MUST** support total page count in the Chromium margin-box capability profile.
- **EPC-RUN-007 MUST** support configurable page-number formats such as `3`, `Page 3`, and `Page 3 of 12`.
- **EPC-RUN-008 SHOULD** support Roman numeral formatting where the renderer supports counter styles predictably.
- **EPC-RUN-009 MUST** allow first/title/back/blank pages to suppress running content.
- **EPC-RUN-010 MUST** permit odd/even or left/right placement rules when supported by the active renderer.
- **EPC-RUN-011 MUST NOT** claim portable running-header support in Firefox or Safari when the implementation depends on CSS page-margin boxes.
- **EPC-RUN-012 MUST** provide graceful degradation when running margin boxes are unavailable; content must not be lost.
- **EPC-RUN-013 SHOULD** offer an in-flow header/footer pattern for documents whose repeated running regions are not required.
- **EPC-RUN-014 MUST** warn in documentation that browser-generated URL/date/title headers and footers are independent browser settings and should be disabled for controlled PDF output.
- **EPC-RUN-015 SHOULD** allow section-specific running headings only in capability levels where a renderer supports named strings/running elements, or where an explicitly tested alternative exists.
- **EPC-RUN-016 MUST NOT** approximate total page count by guessing from content height.

## 7. Fragmentation and pagination control

- **EPC-FRAG-001 MUST** support keep-together intent for figures, callouts, short tables, signatures, and other atomic blocks.
- **EPC-FRAG-002 MUST** support keep-with-next intent for headings and labels.
- **EPC-FRAG-003 MUST** support avoid-break-before and avoid-break-after intent where meaningful.
- **EPC-FRAG-004 MUST** allow explicit page breaks.
- **EPC-FRAG-005 MUST** allow explicit column breaks.
- **EPC-FRAG-006 MUST** avoid clipping overflow merely to force a page count.
- **EPC-FRAG-007 MUST** permit oversized content to fragment when keeping it together would make output impossible.
- **EPC-FRAG-008 MUST** define deterministic precedence when explicit breaks, named pages, and keep rules conflict.
- **EPC-FRAG-009 SHOULD** set sensible `orphans` and `widows` values as progressive enhancement.
- **EPC-FRAG-010 MUST NOT** treat `orphans`/`widows` as a portable guarantee.
- **EPC-FRAG-011 MUST** keep figure captions with their associated figure where possible.
- **EPC-FRAG-012 MUST** keep short headings with at least a meaningful amount of following content where supported.
- **EPC-FRAG-013 MUST** test nested fragmentation cases such as a figure inside a column inside a page.
- **EPC-FRAG-014 MUST** define what happens when a keep-together block is taller than the printable page area.
- **EPC-FRAG-015 MUST** avoid screen-layout properties known to interfere with print fragmentation, including accidental fixed heights, scroll overflow, and unnecessary flex/grid containers around long-flow content.

## 8. Multi-column layout

- **EPC-COL-001 MUST** support one-, two-, and three-column body layouts.
- **EPC-COL-002 MAY** support higher column counts but they are not first-release quality targets.
- **EPC-COL-003 MUST** support configurable column gap.
- **EPC-COL-004 MUST** support configurable column rule.
- **EPC-COL-005 SHOULD** support either explicit column count or target column width.
- **EPC-COL-006 MUST** preserve source/reading order through columns.
- **EPC-COL-007 MUST** support content spanning all columns where browser support is adequate and tested.
- **EPC-COL-008 MUST** support explicit column breaks.
- **EPC-COL-009 MUST** apply break-avoid rules to atomic figures/callouts inside columns.
- **EPC-COL-010 MUST** define whether balancing is expected at natural column ends and must test actual browser behavior.
- **EPC-COL-011 MUST** permit returning from multicolumn content to a single-column section without invalid DOM or manual page positioning.
- **EPC-COL-012 MUST** test columns across page boundaries rather than only in a single viewport.

## 9. Sidebars, rails, and margin content

- **EPC-SIDE-001 MUST** provide an in-flow side-panel/sidebar layout that works in the portable capability profile.
- **EPC-SIDE-002 MUST** support left, right, inside, and outside placement intents.
- **EPC-SIDE-003 MUST** allow configurable sidebar width and gutter.
- **EPC-SIDE-004 MUST** provide a fallback that linearizes the sidebar in logical source order on narrow screen previews or unsupported layouts.
- **EPC-SIDE-005 MUST** avoid absolute positioning for portable sidebars when it can cause overlap or clipping across pages.
- **EPC-SIDE-006 MUST** keep sidebar reading order semantically valid for assistive technology.
- **EPC-SIDE-007 SHOULD** support sidebar variants for notes, metadata, pull quotes, annotations, and section summaries.
- **EPC-SIDE-008 MUST** distinguish an in-flow sidebar from a true paged-media sidenote/margin-note.
- **EPC-SIDE-009 MAY** expose true sidenotes/margin notes in the enhanced-renderer capability profile.
- **EPC-SIDE-010 MUST** define the interaction between sidebars and multi-column content.
- **EPC-SIDE-011 MUST** test sidebars that span more vertical space than the adjacent main content.
- **EPC-SIDE-012 MUST** avoid relying on color alone to distinguish sidebar meaning.

## 10. Backgrounds, watermarks, and page artwork

- **EPC-ART-001 MUST** support decorative page artwork.
- **EPC-ART-002 MUST** support background images on title, body section, and back-page layouts.
- **EPC-ART-003 MUST** support `cover`, `contain`, stretch, tile, and positioned artwork modes where sensible.
- **EPC-ART-004 MUST** allow background/art opacity without reducing foreground text opacity.
- **EPC-ART-005 MUST** support watermarks with configurable content placement and opacity.
- **EPC-ART-006 MUST NOT** depend on unsupported `@page { background-image: ... }` behavior in mainstream browsers.
- **EPC-ART-007 MUST** provide an element-layer strategy for full-page artwork when the graphic is important to document identity or meaning.
- **EPC-ART-008 MUST** support `print-color-adjust: exact` as an opt-in/appropriate print rule while documenting that user print preferences can still override it.
- **EPC-ART-009 MUST** remain understandable if decorative backgrounds are omitted by a browser/printer.
- **EPC-ART-010 MUST** require essential information to exist as content, not only as a CSS background.
- **EPC-ART-011 MUST** permit alternate grayscale-safe treatment.
- **EPC-ART-012 SHOULD** allow a per-section artwork layer without causing the layer itself to become an unwanted fragmentation boundary.
- **EPC-ART-013 MUST** define stacking order for artwork, watermarks, content, and annotations.

## 11. Typography and reading

- **EPC-TYPE-001 MUST** provide print-oriented typography tokens for body size, heading scale, line height, paragraph spacing, and measure.
- **EPC-TYPE-002 MUST** express typography in print-appropriate units and allow consumer overrides.
- **EPC-TYPE-003 MUST** establish hierarchy through more than font size alone.
- **EPC-TYPE-004 MUST** avoid low-contrast secondary text as a default.
- **EPC-TYPE-005 MUST** permit serif and sans-serif theme families.
- **EPC-TYPE-006 MUST NOT** require network-hosted fonts.
- **EPC-TYPE-007 MUST** support application-supplied/self-hosted fonts.
- **EPC-TYPE-008 MUST** define robust fallback font stacks.
- **EPC-TYPE-009 MUST** support `hyphens: auto|manual|none` intent.
- **EPC-TYPE-010 MUST** preserve and propagate document `lang` because automatic hyphenation is language dependent.
- **EPC-TYPE-011 MUST** support left-to-right and right-to-left document direction.
- **EPC-TYPE-012 SHOULD** investigate CJK line-breaking and vertical-writing needs before claiming full CJK publishing support.
- **EPC-TYPE-013 MUST** prevent accidental text truncation in print.
- **EPC-TYPE-014 MUST** provide styles for superscript, subscript, small print, captions, labels, and metadata.
- **EPC-TYPE-015 SHOULD** support hanging punctuation or advanced typographic refinements only as progressive enhancement.
- **EPC-TYPE-016 MUST** allow a print-specific maximum text measure independent of the screen preview width.
- **EPC-TYPE-017 MUST** test typography under missing-font fallback because font substitution changes pagination.

## 12. Core content patterns

- **EPC-CONT-001 MUST** style native headings, paragraphs, ordered/unordered lists, description lists, blockquotes, horizontal rules, links, emphasis, and code.
- **EPC-CONT-002 MUST** provide professional default spacing between semantic content blocks.
- **EPC-CONT-003 MUST** provide a callout primitive with semantic variants that remain distinguishable without color.
- **EPC-CONT-004 MUST** provide a figure pattern supporting image/SVG content plus caption.
- **EPC-CONT-005 MUST** constrain images to the printable content area by default.
- **EPC-CONT-006 MUST** preserve image aspect ratio unless the consumer explicitly chooses a crop/fill mode.
- **EPC-CONT-007 MUST** define behavior for very tall images.
- **EPC-CONT-008 MUST** support tables with semantic `caption`, `thead`, `tbody`, `tfoot`, row headers, and column headers.
- **EPC-CONT-009 MUST** permit table headers to repeat on subsequent pages where the renderer supports standard table-header repetition.
- **EPC-CONT-010 MUST** provide controls for whether a row may split across pages.
- **EPC-CONT-011 MUST** provide a wide-table strategy, preferably switching to a named landscape page profile rather than shrinking text below readability.
- **EPC-CONT-012 MUST** avoid horizontal scroll as a print solution.
- **EPC-CONT-013 MUST** provide a code-block pattern with configurable wrapping and overflow policy.
- **EPC-CONT-014 MUST** preserve whitespace semantics in code.
- **EPC-CONT-015 SHOULD** support optional code line numbers without making them part of copied code.
- **EPC-CONT-016 MUST** provide note/endnote semantics that remain usable in the portable profile.
- **EPC-CONT-017 MAY** provide automatic page-footnote placement in the enhanced-renderer profile.
- **EPC-CONT-018 MUST** support citations and reference lists as ordinary semantic content.
- **EPC-CONT-019 SHOULD** provide a table-of-contents component that can render a semantic linked outline in all profiles.
- **EPC-CONT-020 MAY** add target page numbers to TOC entries only when the active renderer can calculate them reliably.
- **EPC-CONT-021 MUST** allow an application to supply its own generated TOC without using the component.
- **EPC-CONT-022 SHOULD** provide key/value metadata, signature blocks, approval blocks, address blocks, and document-status blocks as reusable patterns or recipes.
- **EPC-CONT-023 SHOULD** provide charts/graphics guidance but MUST NOT couple core print layout to a charting library.
- **EPC-CONT-024 MUST** support inline SVG supplied by an application.
- **EPC-CONT-025 MUST** define print treatment for hyperlinks, including an opt-in URL-after-link style rather than forcing URLs into every printed document.
- **EPC-CONT-026 MUST** preserve QR codes/barcodes supplied as semantic images without generating them in core.

## 13. Accessibility and inclusive output

- **EPC-A11Y-001 MUST** preserve semantic HTML and heading hierarchy.
- **EPC-A11Y-002 MUST** keep DOM/source order aligned with visual/reading order.
- **EPC-A11Y-003 MUST NOT** use color as the only carrier of status, category, warning, or hierarchy.
- **EPC-A11Y-004 MUST** provide contrast-safe default text and rule colors.
- **EPC-A11Y-005 MUST** remain legible in grayscale printing.
- **EPC-A11Y-006 MUST** pass through application-provided alternative text for images.
- **EPC-A11Y-007 MUST** support decorative images with empty alt semantics rather than forcing meaningless labels.
- **EPC-A11Y-008 MUST** support semantic table headers and captions.
- **EPC-A11Y-009 MUST** preserve link text that makes sense without color.
- **EPC-A11Y-010 MUST** preserve `lang` and `dir`.
- **EPC-A11Y-011 MUST** avoid print-only visual reordering that changes semantic sequence.
- **EPC-A11Y-012 MUST** support browser zoom and text scaling in the on-screen preview.
- **EPC-A11Y-013 MUST** support forced-colors/high-contrast modes for interactive preview controls.
- **EPC-A11Y-014 MUST** honor reduced-motion preferences in any animated preview/configuration UI.
- **EPC-A11Y-015 MUST** make preview controls keyboard accessible.
- **EPC-A11Y-016 MUST** keep focus order consistent with visual order in interactive preview UI.
- **EPC-A11Y-017 MUST** document the limits of accessibility in generated browser PDFs, including tagged-PDF uncertainty, rather than implying semantic HTML automatically creates fully accessible PDF output.
- **EPC-A11Y-018 SHOULD** evaluate an enhanced PDF/UA or tagged-PDF renderer path as a separate capability if customer use cases require it.
- **EPC-A11Y-019 MUST** avoid dyslexia-specific typography claims without evidence; the system should instead expose legible typography controls and permit user/organization preferences.
- **EPC-A11Y-020 MUST** test color-vision-deficiency simulations for themes where color conveys grouping or emphasis.
- **EPC-A11Y-021 MUST** treat accessibility as a design constraint in component acceptance criteria, not a final audit step.

## 14. Theme and design-token system

- **EPC-THEME-001 MUST** provide a documented design-token hierarchy.
- **EPC-THEME-002 SHOULD** separate foundation tokens, document/page tokens, and component tokens.
- **EPC-THEME-003 MUST** use CSS custom properties as the primary consumer override mechanism.
- **EPC-THEME-004 SHOULD** use CSS cascade layers to separate reset/foundation/component/theme/consumer concerns.
- **EPC-THEME-005 MUST** make consumer overrides possible without `!important` in normal cases.
- **EPC-THEME-006 MUST** ship a professional neutral default theme.
- **EPC-THEME-007 SHOULD** ship at least one restrained branded/report theme as an example.
- **EPC-THEME-008 MUST** support color and grayscale print modes.
- **EPC-THEME-009 MUST** allow logo, accent, typography, rule, spacing, page margin, header/footer, column, and sidebar tokens to be overridden.
- **EPC-THEME-010 MUST** separate screen-preview chrome from printed document theme.
- **EPC-THEME-011 MUST NOT** let dark-mode preview automatically create a dark-background printed document.
- **EPC-THEME-012 MUST** document which tokens affect pagination and therefore can change page count.
- **EPC-THEME-013 SHOULD** permit organizations to publish theme-only packages without forking core.
- **EPC-THEME-014 MUST** test consumer themes against all canonical fixtures.

## 15. Renderer capability model

The library must tell the truth about what an output path can actually do.

### Capability P0: Portable browser print

Expected common capabilities: print media styles, page size/margins, named pages, fragmentation controls, ordinary content, multicolumn layout, in-flow sidebars, title/back page styling, and hyphenation where language dictionaries exist.

### Capability P1: Chromium page-margin print

Adds CSS page-margin boxes and page/page-total counters in modern Chromium-derived browsers.

### Capability P2: Deterministic Chromium export

Runs a controlled Chromium/headless-Chromium export with fixed print options, known browser version, assets/fonts awaited, browser headers disabled, and a tested output contract.

### Capability P3: Enhanced paged-media renderer

Optional adapters for engines such as Vivliostyle or Prince may provide advanced running content, named strings, target counters, automatic footnotes, sidenotes/page floats, bleed/marks, and other professional publishing features. Each adapter must declare exactly what it supports.

- **EPC-CAP-001 MUST** assign every renderer-dependent feature a declared minimum capability.
- **EPC-CAP-002 MUST** provide a machine-readable capability description.
- **EPC-CAP-003 MUST NOT** silently pretend a missing capability succeeded.
- **EPC-CAP-004 MUST** allow an application to ask whether page-margin boxes are available/guaranteed in its selected output path.
- **EPC-CAP-005 MUST** allow an application to ask whether total-page counters are available/guaranteed.
- **EPC-CAP-006 MUST** allow an application to ask whether automatic footnotes, target page counters, bleed/marks, and true sidenotes are available.
- **EPC-CAP-007 MUST** distinguish browser feature detection from an application's declared renderer contract; print-preview feature detection alone cannot guarantee printer/PDF behavior.
- **EPC-CAP-008 MUST** version the capability schema.
- **EPC-CAP-009 MUST** include capability information in diagnostics.
- **EPC-CAP-010 MUST** provide a documented fallback for every P1+ component or feature.
- **EPC-CAP-011 SHOULD** allow strict mode to fail document export when a requested required feature is unavailable.
- **EPC-CAP-012 SHOULD** allow permissive mode to degrade with explicit diagnostics when configured by the application.
- **EPC-CAP-013 MUST** keep optional renderer integrations out of the core runtime dependency graph.
- **EPC-CAP-014 MUST** document commercial/licensing implications of any non-open renderer adapter separately from core.

## 16. Print and export behavior

- **EPC-OUT-001 MUST** support ordinary `window.print()` without requiring an export service.
- **EPC-OUT-002 MUST** provide a deterministic PDF-export contract suitable for automation.
- **EPC-OUT-003 SHOULD** implement deterministic Chromium export in a separate adapter/tool package.
- **EPC-OUT-004 MUST** await document fonts before deterministic capture.
- **EPC-OUT-005 MUST** await required images and other document assets before deterministic capture.
- **EPC-OUT-006 MUST** provide an asset-timeout policy and diagnostics.
- **EPC-OUT-007 MUST** disable browser-generated headers/footers in deterministic export.
- **EPC-OUT-008 MUST** configure print backgrounds explicitly in deterministic export when the document requires them.
- **EPC-OUT-009 MUST** select page size/margins consistently with document CSS and report conflicts.
- **EPC-OUT-010 MUST** define whether CSS `@page` or export-tool options win when both specify dimensions.
- **EPC-OUT-011 MUST** avoid using `beforeprint`/ `afterprint` to mutate essential document content.
- **EPC-OUT-012 MAY** use print lifecycle events to hide/restore nonessential preview controls.
- **EPC-OUT-013 MUST** support a print-only stylesheet path.
- **EPC-OUT-014 MUST** provide a screen preview style that approximates page boundaries without claiming pixel identity with final pagination.
- **EPC-OUT-015 SHOULD** provide a diagnostics mode that visually marks page profiles, content bounds, safe areas, break requests, and capability-dependent features.
- **EPC-OUT-016 MUST** permit generated PDFs to be byte-different across renderer versions while still having testable semantic/layout invariants.
- **EPC-OUT-017 MUST** record renderer name/version in deterministic test evidence.

## 17. Preview/configurator application

- **EPC-PREV-001 SHOULD** provide a static demonstration site containing real examples rather than screenshots.
- **EPC-PREV-002 SHOULD** provide controls for page size, orientation, theme, margins, columns, and representative component variants.
- **EPC-PREV-003 MUST** keep preview configuration state outside the printable document semantics.
- **EPC-PREV-004 MUST** hide preview controls from print media.
- **EPC-PREV-005 MUST** use Limen for browser/application boundary handling if the preview contains meaningful state or browser effects.
- **EPC-PREV-006 SHOULD** keep preview/application decisions in F# if an F# engine is introduced; JavaScript/TypeScript should remain browser-boundary and component-lifecycle code.
- **EPC-PREV-007 MUST** make examples viewable as source.
- **EPC-PREV-008 SHOULD** offer a one-click print action and a deterministic export example when the latter exists.
- **EPC-PREV-009 MUST** display capability warnings when an example relies on a feature unsupported by the current output path.

## 18. Security, privacy, and robustness

- **EPC-SEC-001 MUST** treat child HTML as application-owned DOM and MUST NOT serialize/reparse it unnecessarily.
- **EPC-SEC-002 MUST** escape values inserted into generated CSS or generated text.
- **EPC-SEC-003 MUST** validate named page/profile identifiers before interpolating them into stylesheets.
- **EPC-SEC-004 MUST** be compatible with restrictive Content Security Policy configurations.
- **EPC-SEC-005 MUST NOT** require inline event handlers.
- **EPC-SEC-006 MUST NOT** use `eval`, `new Function`, or equivalent dynamic code execution.
- **EPC-SEC-007 MUST NOT** transmit document content.
- **EPC-SEC-008 MUST NOT** persist document content unless an embedding application explicitly does so.
- **EPC-SEC-009 MUST** handle missing images/fonts without throwing the entire document away.
- **EPC-SEC-010 MUST** avoid infinite layout/reflow loops when custom properties or attributes change.
- **EPC-SEC-011 MUST** document any use of blob/data URLs if introduced by export helpers.
- **EPC-SEC-012 SHOULD** support nonce-based style insertion if runtime-generated `@page` rules are required under CSP.

## 19. Performance

- **EPC-PERF-001 MUST** avoid per-node observers across the entire document.
- **EPC-PERF-002 MUST** avoid continuous content-height measurement for pagination.
- **EPC-PERF-003 MUST** keep registration/startup cost small enough that including the package does not materially slow ordinary document display.
- **EPC-PERF-004 MUST** allow CSS-only use when dynamic behavior is unnecessary.
- **EPC-PERF-005 MUST** avoid duplicate stylesheets per component instance.
- **EPC-PERF-006 MUST** test long documents with hundreds of content blocks.
- **EPC-PERF-007 MUST** test image-heavy and table-heavy documents.
- **EPC-PERF-008 SHOULD** publish package size and performance measurements once implementation exists, with collection method and limitations.

## 20. Testing and conformance

- **EPC-TEST-001 MUST** maintain canonical print fixtures in source control.
- **EPC-TEST-002 MUST** include at least: simple report; title/body/back document; multi-column article; side-panel report; image-heavy document; long table; landscape wide-table section; code-heavy technical document; RTL document; grayscale document; and mixed page-profile document.
- **EPC-TEST-003 MUST** test US Letter and A4.
- **EPC-TEST-004 MUST** test portrait and landscape.
- **EPC-TEST-005 MUST** test documents longer than ten pages.
- **EPC-TEST-006 MUST** test title and back pages with full-page artwork.
- **EPC-TEST-007 MUST** test current and total page numbers in the Chromium capability profile.
- **EPC-TEST-008 MUST** test the fallback when page-margin boxes are absent.
- **EPC-TEST-009 MUST** test missing-background output.
- **EPC-TEST-010 MUST** test delayed/missing fonts.
- **EPC-TEST-011 MUST** test delayed/missing images.
- **EPC-TEST-012 MUST** test very tall atomic content.
- **EPC-TEST-013 MUST** test nested columns, figures, and break rules.
- **EPC-TEST-014 MUST** test table header repetition and row fragmentation in each supported renderer.
- **EPC-TEST-015 MUST** use a pinned Chromium version for deterministic visual regression.
- **EPC-TEST-016 MUST** supplement pixel comparison with structural assertions such as page count ranges, text presence, element bounds, overlap detection, and clipping detection.
- **EPC-TEST-017 MUST** fail when required text disappears from output.
- **EPC-TEST-018 MUST** detect content rendered outside the printable safe region unless explicitly allowed.
- **EPC-TEST-019 MUST** detect overlapping foreground blocks in canonical fixtures.
- **EPC-TEST-020 MUST** test modern Chrome/Chromium and Firefox for portable features.
- **EPC-TEST-021 SHOULD** test Safari/WebKit in a supported CI or scheduled environment.
- **EPC-TEST-022 MUST** maintain a renderer capability matrix generated from tested behavior, not assumptions.
- **EPC-TEST-023 MUST** separate a standards expectation from observed browser behavior in failure reports.
- **EPC-TEST-024 MUST** test accessibility semantics in source DOM independently of PDF rendering.
- **EPC-TEST-025 MUST** test themes in color, grayscale, and backgrounds-disabled modes.
- **EPC-TEST-026 MUST** add regression fixtures for every browser-print defect that reaches production.
- **EPC-TEST-027 SHOULD** test printer/PDF output at physical dimensions using PDF box metadata and geometric assertions where possible.
- **EPC-TEST-028 MUST** keep screenshots/PDF baselines versioned with the renderer version that produced them.
- **EPC-TEST-029 MUST** include clean-room install tests of the published package.
- **EPC-TEST-030 MUST** verify that basic examples still render meaningful output with JavaScript disabled.

## 21. Documentation and developer experience

- **EPC-DOC-001 MUST** provide a five-minute quick start.
- **EPC-DOC-002 MUST** provide a complete component/attribute/token reference.
- **EPC-DOC-003 MUST** provide copyable examples for every core component.
- **EPC-DOC-004 MUST** document page-size and margin configuration.
- **EPC-DOC-005 MUST** document headers, footers, and page numbering with capability caveats.
- **EPC-DOC-006 MUST** document multi-column and sidebar layout.
- **EPC-DOC-007 MUST** document title/back pages and page artwork.
- **EPC-DOC-008 MUST** document tables, figures, code blocks, notes, and TOCs.
- **EPC-DOC-009 MUST** document browser-generated header/footer behavior.
- **EPC-DOC-010 MUST** document print-background caveats.
- **EPC-DOC-011 MUST** document renderer capability levels and feature fallbacks.
- **EPC-DOC-012 MUST** document accessibility expectations and PDF accessibility limitations.
- **EPC-DOC-013 MUST** include migration notes for breaking component/token changes.
- **EPC-DOC-014 MUST** include troubleshooting for clipping, blank pages, unexpected breaks, missing backgrounds, missing fonts, and browser-specific output.
- **EPC-DOC-015 SHOULD** provide recipes for reports, proposals, invoices, technical manuals, research papers, and decision memos.
- **EPC-DOC-016 SHOULD** include a print diagnostics checklist.
- **EPC-DOC-017 MUST** label experimental renderer-specific features clearly.

## 22. Governance and engineering integration

- **EPC-GOV-001 MUST** follow the repository's installed ROS work protocol for meaningful implementation changes.
- **EPC-GOV-002 MUST** follow SDE/Ordo state/transition and verification guidance where applicable.
- **EPC-GOV-003 MUST** apply Visual Engineering guidance to preview UI, component visual defaults, typography, hierarchy, color, and accessibility.
- **EPC-GOV-004 MUST** apply Communication Engineering guidance to document structures and examples where purpose, audience, proof obligation, or uncertainty materially affect layout.
- **EPC-GOV-005 MUST** preserve the distinction between research findings, design decisions, implementation, and tests.
- **EPC-GOV-006 MUST** create decision records for costly-to-reverse public API, renderer, or theming decisions.
- **EPC-GOV-007 MUST** maintain browser/renderer evidence with observation date and version.
- **EPC-GOV-008 MUST** challenge assumptions through real print/PDF fixtures before declaring a feature portable.
- **EPC-GOV-009 MUST** keep unsupported-feature behavior explicit in acceptance tests.
- **EPC-GOV-010 MUST** avoid adding dependencies solely for developer convenience when standards or small local code suffice.

## 23. Explicit non-goals for initial release

- **EPC-NG-001** No drag-and-drop page designer.
- **EPC-NG-002** No full word-processing editor.
- **EPC-NG-003** No proprietary document storage format.
- **EPC-NG-004** No JavaScript reimplementation of a complete pagination engine.
- **EPC-NG-005** No claim of pixel-identical output across every browser/printer.
- **EPC-NG-006** No CMYK/prepress guarantee from normal browser printing.
- **EPC-NG-007** No claim of crop/bleed support in mainstream browsers where those features are not implemented.
- **EPC-NG-008** No guarantee of tagged/PDF-UA output from browser-generated PDFs without a separately validated renderer.
- **EPC-NG-009** No charting library bundled into core.
- **EPC-NG-010** No business/domain logic in presentation components.

## 24. First implementation milestone

The first vertical slice should prove the difficult architectural choices rather than merely render a styled paragraph.

### Required demonstration document

A single example document MUST contain:

1. a branded title page with full-page artwork;
2. normal body pages in US Letter and A4 test variants;
3. a repeated header/footer and `Page X of Y` in the Chromium capability profile;
4. fallback output without repeated margin content in Firefox/Safari-compatible portable mode;
5. a two-column section with a full-width heading/figure;
6. a side-panel section;
7. an image/figure with caption;
8. a multipage table with repeated header behavior tested;
9. a code block;
10. an explicit page break;
11. a landscape named-page section;
12. a final/back page;
13. color and grayscale themes;
14. backgrounds-enabled and backgrounds-disabled test output;
15. deterministic Chromium PDF output;
16. diagnostics showing which features require P1/P2/P3.

### Milestone acceptance criteria

- **EPC-M1-001 MUST** install from a clean npm consumer fixture.
- **EPC-M1-002 MUST** render meaningful static HTML with JavaScript disabled.
- **EPC-M1-003 MUST** pass ROS, SDE, Visual Engineering, Communication Engineering, and Limen verification where each applies.
- **EPC-M1-004 MUST** have automated tests for the canonical demonstration document.
- **EPC-M1-005 MUST** have no known clipped or missing content in the deterministic Chromium PDF.
- **EPC-M1-006 MUST** retain all meaningful content when printed from current Firefox even when Chromium-only margin boxes are absent.
- **EPC-M1-007 MUST** retain all meaningful content when printed from current Safari/WebKit in the portable profile, subject to documented engine limitations.
- **EPC-M1-008 MUST** document every intentional renderer difference.
- **EPC-M1-009 MUST** make theme overrides possible without modifying package source.
- **EPC-M1-010 MUST** include evidence-driven follow-up decisions before expanding the public component surface.

## 25. Research questions that must be answered by experiments

1. Does a light-DOM custom-element wrapper fragment identically to an equivalent `div`/semantic element in Chrome, Firefox, Safari, and enhanced renderers?
2. Which combinations of grid/flex and page fragmentation are safe enough for portable side-panel layouts?
3. How reliably do table headers repeat and table rows split in each target renderer?
4. Can Chromium page-margin generated content meet all required header/footer use cases without `string-set`/running elements?
5. What is the best explicit fallback for section-specific running headers outside enhanced renderers?
6. Which CSS variables can safely parameterize page layout without requiring runtime-generated `@page` rules?
7. If runtime-generated `@page` CSS is needed, what CSP-safe API should own it?
8. How do browser font loading/substitution changes affect page-count stability?
9. What page-background strategy survives user background-print settings while preserving meaning and avoiding duplicated art?
10. How does multicolumn fragmentation interact with figures, callouts, sidebars, and named page changes?
11. Which PDF structural/accessibility metadata does Chromium actually preserve from semantic HTML?
12. Should a Vivliostyle adapter be shipped, documented as a recipe, or kept as an external integration?
13. Is a Prince adapter valuable enough to justify a commercial-renderer integration surface?
14. Which physical-output assertions can be automated from PDF page boxes and coordinates?
15. What minimum public primitive set covers most document layouts without becoming a parallel HTML vocabulary?

## 26. Standard report composition profile

Folio must provide a reusable presentation contract for professional result reports without taking ownership of domain scoring, interpretation, privacy, or recommendation logic. Signal is the first concrete consumer, but this profile must remain useful for diagnostics, research reports, business reviews, audit reports, and other evidence-oriented documents.

### 26.1 Ownership and composition boundary

- **EPC-RPT-001 MUST** treat the application as the owner of report meaning and Folio as the owner of reusable document presentation.
- **EPC-RPT-002 MUST NOT** calculate scores, classifications, recommendations, confidence, benchmark applicability, statistical significance, or domain conclusions.
- **EPC-RPT-003 MUST** accept already-prepared semantic content and preserve it through print/PDF rendering.
- **EPC-RPT-004 MUST** permit a consumer to construct the standard report profile from Folio primitives without a separate pagination engine.
- **EPC-RPT-005 MUST** preserve logical source order independently of visual page composition.
- **EPC-RPT-006 MUST** support both US Letter and A4 for the standard report profile.
- **EPC-RPT-007 MUST** allow the same semantic report content to render at P0/P1/P2/P3 capability levels with explicit, documented degradation.
- **EPC-RPT-008 MUST NOT** make PDF the canonical report representation.
- **EPC-RPT-009 MUST** keep report composition useful in semantic HTML before custom-element upgrade.
- **EPC-RPT-010 SHOULD** provide a documented recipe and canonical fixture for the standard report profile.

### 26.2 Standard report anatomy

The profile MUST be able to compose, in logical reading order:

1. Cover/title page
2. Executive summary
3. Results/metrics at a glance
4. Integrity/quality/limitations summary
5. Repeating detail sections
6. Cross-section findings
7. Domain-specific analysis
8. Decision-support/action sections
9. Distribution/evidence tables and figures
10. Comparisons/trends
11. Methodology
12. Appendix/provenance

- **EPC-RPT-011 MUST** allow sections to be omitted without blank artifacts or broken numbering.
- **EPC-RPT-012 MUST** support long documents with natural fragmentation.
- **EPC-RPT-013 MUST** support explicit major-section break intent.
- **EPC-RPT-014 SHOULD** support TOC generation/composition where renderer capability allows it, with a useful manual/static fallback.
- **EPC-RPT-015 MUST** support a cover that suppresses ordinary running header/footer content.
- **EPC-RPT-016 MUST** support body-page running-content intent independently from the cover.
- **EPC-RPT-017 MUST** support landscape page profiles inside an otherwise portrait report.
- **EPC-RPT-018 MUST** allow appendices to use the same document identity and page-number sequence unless the consumer explicitly selects a different profile.

### 26.3 Reusable report presentation patterns

Folio SHOULD provide reusable presentation patterns, recipes, or narrowly justified primitives for:

- report cover metadata;
- key metrics/results;
- compact integrity/quality summaries;
- findings;
- observation/implication/action/evidence-required sequences;
- comparison rows/cards;
- dimension/section summaries;
- warning/limitation callouts;
- provenance/methodology metadata.

- **EPC-RPT-019 MUST** keep these patterns domain-neutral.
- **EPC-RPT-020 MUST NOT** introduce a Signal-specific score model into Folio.
- **EPC-RPT-021 MUST** prefer semantic native HTML inside report patterns.
- **EPC-RPT-022 MUST** require evidence before adding a new public custom element where a documented composition recipe using existing primitives is sufficient.
- **EPC-RPT-023 MAY** introduce report-specific public primitives when repeated implementation demonstrates a stable reusable layout contract.
- **EPC-RPT-024 MUST** document whether each report pattern is a primitive, CSS recipe, or higher-level composition.
- **EPC-RPT-025 MUST** keep report-specific patterns compatible with consumer themes.

Candidate elements such as `ef-print-report`, `ef-print-report-cover`, `ef-print-metric`, `ef-print-finding`, and `ef-print-integrity` remain architecture candidates until usage evidence justifies their public API. This requirement intentionally avoids prematurely expanding the custom-element surface.

### 26.4 Result-integrity presentation

- **EPC-RPT-026 MUST** provide a standard visual composition for integrity, confidence, coverage, completeness, comparability, warnings, and known limitations supplied by the consumer.
- **EPC-RPT-027 MUST** visually distinguish integrity/quality metadata from the primary performance/result metric.
- **EPC-RPT-028 MUST** support explicit states such as complete, partial, insufficient data, not comparable, suppressed, unavailable, and low confidence.
- **EPC-RPT-029 MUST NOT** style an unavailable or suppressed value as if it were numeric zero.
- **EPC-RPT-030 MUST** allow material limitations to remain visible in print rather than existing only as interactive tooltips.
- **EPC-RPT-031 MUST** permit a compact integrity block on executive reports and an expanded form on technical reports using the same semantic source content.

### 26.5 Charts, figures, and data presentation

- **EPC-RPT-032 MUST** support consumer-provided radar/spider, bar, range, distribution, trend, and comparison figures through the generic figure contract.
- **EPC-RPT-033 MUST NOT** bundle a charting library into Folio core.
- **EPC-RPT-034 MUST** support captions and accompanying textual/tabular equivalents.
- **EPC-RPT-035 MUST** keep figure captions with their figures where renderer behavior permits.
- **EPC-RPT-036 MUST** support grayscale-safe figure framing and legends.
- **EPC-RPT-037 MUST** provide theme tokens that permit chart series to be distinguished by more than color.
- **EPC-RPT-038 MUST** support direct labels/patterns/line styles supplied by the consumer.
- **EPC-RPT-039 MUST** support wide data tables through an explicit landscape or wide-page profile rather than clipping content.
- **EPC-RPT-040 MUST** test multi-page table header repetition under each supported renderer profile.

### 26.6 Page identity and running content

- **EPC-RPT-041 SHOULD** provide a standard running-header recipe for report title/section context.
- **EPC-RPT-042 SHOULD** provide a standard running-footer recipe for report identifier/version context plus page number.
- **EPC-RPT-043 MUST** support current-page numbering where the selected renderer can guarantee it.
- **EPC-RPT-044 SHOULD** support `Page X of Y` in capability profiles that guarantee total-page counters.
- **EPC-RPT-045 MUST** provide a meaningful fallback when total-page counters are unavailable.
- **EPC-RPT-046 MUST** permit the consumer to suppress confidential or identifying metadata from running content.
- **EPC-RPT-047 MUST** prevent decorative running content from becoming the only location of essential report meaning.
- **EPC-RPT-048 MUST** keep report identity stable when a document switches to a landscape page profile.

### 26.7 Letter/A4 portability

- **EPC-RPT-049 MUST** include canonical standard-report fixtures for both US Letter and A4.
- **EPC-RPT-050 SHOULD** define a common logical content grid/token set that keeps the two page-size variants compositionally similar.
- **EPC-RPT-051 MUST** allow page-size-specific margin tuning without changing report semantics.
- **EPC-RPT-052 MUST** test page-size variants for clipping, awkward single-line spill pages, table overflow, and heading orphans.
- **EPC-RPT-053 MUST** record page-count differences between Letter and A4 as permissible renderer/layout differences rather than semantic differences.
- **EPC-RPT-054 MUST NOT** require consumers to maintain separate report markup for Letter and A4.

### 26.8 Typography, branding, and white labeling

- **EPC-RPT-055 MUST** use Folio theme tokens for report typography, spacing, rules, page margins, accents, and running content.
- **EPC-RPT-056 MUST** support a restrained professional default report theme.
- **EPC-RPT-057 MUST** support white-label logo/name/accent/typography overrides without forking core.
- **EPC-RPT-058 MUST** preserve accessibility constraints under consumer themes.
- **EPC-RPT-059 MUST** preserve warning, limitation, and integrity visibility under consumer themes.
- **EPC-RPT-060 MUST** separate branding from report semantics.
- **EPC-RPT-061 SHOULD** provide a theme/version identifier suitable for formal report provenance.
- **EPC-RPT-062 MUST** provide a backgrounds-disabled fallback in which essential branding and document identity remain legible.

### 26.9 Accessibility for result reports

- **EPC-RPT-063 MUST** preserve semantic heading hierarchy and table semantics in the source DOM.
- **EPC-RPT-064 MUST** support text alternatives/descriptions for meaningful figures.
- **EPC-RPT-065 MUST** require a non-chart equivalent when a chart carries information not otherwise available in the document.
- **EPC-RPT-066 MUST** keep the standard report understandable without color.
- **EPC-RPT-067 MUST** test the standard report in color, grayscale, and backgrounds-disabled output.
- **EPC-RPT-068 MUST** keep accessibility assertions about browser-generated PDFs within the validated capability of the renderer.
- **EPC-RPT-069 MUST NOT** claim tagged-PDF or PDF/UA conformance merely because source HTML is semantic.
- **EPC-RPT-070 SHOULD** allow a separately validated accessible-PDF renderer adapter to consume the same semantic report markup.

### 26.10 Privacy-safe presentation

- **EPC-RPT-071 MUST** render only content supplied by the consumer and MUST NOT derive hidden detail from aggregate data.
- **EPC-RPT-072 MUST NOT** serialize hidden/suppressed application values into data attributes, generated CSS, comments, accessibility-only text, diagnostics, or metadata.
- **EPC-RPT-073 MUST** allow confidentiality labels without implying that document labeling is access control.
- **EPC-RPT-074 MUST** avoid embedding network credentials, authorization material, or secret-bearing URLs in generated document metadata.
- **EPC-RPT-075 MUST** support deterministic diagnostics without logging document content by default.

### 26.11 Provenance and formal export

- **EPC-RPT-076 MUST** permit consumer-supplied report/profile/version identifiers to be rendered or embedded as non-secret provenance.
- **EPC-RPT-077 SHOULD** expose renderer name/version and Folio version to the deterministic export caller so the application can record report-snapshot provenance.
- **EPC-RPT-078 MUST** distinguish semantic-equivalence reproducibility from byte-for-byte PDF reproducibility.
- **EPC-RPT-079 MUST** support deterministic P2 export fixtures for the standard report profile.
- **EPC-RPT-080 MUST** treat a byte-different PDF as potentially valid when semantic/layout invariants remain satisfied and renderer provenance explains the difference.
- **EPC-RPT-081 MUST** make strict versus permissive capability behavior explicit for formal exports.
- **EPC-RPT-082 MUST** fail strict export when a consumer-declared required report feature is unavailable.

### 26.12 Canonical report fixtures and acceptance

The Folio test suite MUST add canonical fixtures for at least:

- executive summary report;
- full technical report;
- long repeating detail sections;
- integrity states including partial/insufficient/not-comparable;
- radar/spider figure plus textual equivalent;
- distribution-heavy content;
- multi-page tables;
- landscape wide-table section;
- Letter and A4 variants;
- color and grayscale variants;
- backgrounds-disabled output;
- white-label theme;
- long methodology/provenance appendix.

- **EPC-RPT-083 MUST** assert required text presence after deterministic export.
- **EPC-RPT-084 MUST** detect clipped or overlapping report blocks.
- **EPC-RPT-085 MUST** test heading orphan/fragmentation behavior for canonical report sections.
- **EPC-RPT-086 MUST** test running header/footer fallbacks at P0 and current/total page behavior at P1/P2 where supported.
- **EPC-RPT-087 MUST** test that landscape sections return correctly to the body page profile.
- **EPC-RPT-088 MUST** test that a white-label theme cannot make mandatory warnings or integrity text unreadable.
- **EPC-RPT-089 MUST** test meaningful output with JavaScript disabled.
- **EPC-RPT-090 MUST** provide at least three documentation examples for every new public component added specifically for report composition.

### 26.13 Initial implementation boundary

- **EPC-RPT-091 MUST** first implement the standard report using existing Folio primitives wherever they are sufficient.
- **EPC-RPT-092 MUST** use the standard report fixture as evidence for whether candidate report-specific custom elements are necessary.
- **EPC-RPT-093 SHOULD** add only the smallest stable public report-component surface justified by repeated composition.
- **EPC-RPT-094 MUST** keep Signal-specific data contracts out of Folio core.
- **EPC-RPT-095 MUST** document the Signal integration as a consumer recipe rather than make Signal a runtime dependency.
- **EPC-RPT-096 MUST** preserve Folio's standards-first, semantic-HTML, CSS-pagination architecture while adding report composition support.


## 27. Professional profile / resume document family

Work item: `kemiller2002/folio#17`. Reference evidence: `kemiller2002/resume` at `master` commit `ba786e4` (`index.html`, `developer.html`, `resume.css`, `resume.json`); see `EV-PRINT-2026-0006`.

Folio must be able to reproduce the existing resume, its developer variant, and materially different professional profiles (CVs, speaker sheets, staff biographies, credentials sheets, capability statements, project histories, publication lists) without resume-specific public primitives. The IDs below preserve the intent recorded in issue #17; `FOLIO-RES-090` onward add verification, documentation, and ownership obligations discovered during implementation.

### 27.1 Ownership and composition boundary

- **FOLIO-RES-001 MUST** reproduce the current resume's information hierarchy and visual relationships using Folio.
- **FOLIO-RES-002 MUST** support A4 with 10 mm margins and SHOULD validate Letter adaptation without silently changing content semantics.
- **FOLIO-RES-003 MUST** preserve meaningful semantic/source order independently of the visual layout.
- **FOLIO-RES-004 MUST** remain useful with JavaScript disabled once the consuming application has rendered the document content.
- **FOLIO-RES-005 MUST NOT** make application data binding or resume schema part of Folio core.
- **FOLIO-RES-006 MUST NOT** add `ef-print-resume`, `ef-print-job`, `ef-print-education`, `ef-print-employer`, or any other element whose meaning is a resume domain concept.
- **FOLIO-RES-007 MUST** express the reusable professional-profile patterns as documented CSS recipes over semantic HTML unless a recipe demonstrably cannot express the layout contract (`DF-PRINT-2026-0004`).
- **FOLIO-RES-008 MUST** keep content selection, filtering, sorting, variant choice (for example executive versus developer), and date formatting application-owned.

### 27.2 Identity/contact header

- **FOLIO-RES-010 MUST** support a compact identity header containing a dominant name/title region plus a contact region.
- **FOLIO-RES-011 MUST** support stacked or wrapped contact values without overlap.
- **FOLIO-RES-012 MUST** allow links and plain-text equivalents.
- **FOLIO-RES-013 MUST** degrade cleanly on narrow screens while preserving the authored print layout.
- **FOLIO-RES-014 SHOULD** support alternate alignment patterns through tokens/recipes rather than domain-specific elements.

### 27.3 Dated entries

- **FOLIO-RES-020 MUST** support repeated entries with primary identity metadata on the left and a date/date-range region aligned to the right.
- **FOLIO-RES-021 MUST** support one or multiple titles/roles under or beside the organization.
- **FOLIO-RES-022 MUST** support open-ended ranges such as Present.
- **FOLIO-RES-023 MUST** handle long organization/title text without colliding with dates.
- **FOLIO-RES-024 MUST** define fragmentation behavior so entry headings are not orphaned from the first meaningful line of entry content where the renderer can honor keep intent.
- **FOLIO-RES-025 MUST** avoid requiring fixed grid coordinates that are specific to this resume.
- **FOLIO-RES-026 MUST** keep the terminal date region on one line in print and wide screen layouts and let the primary region wrap instead.
- **FOLIO-RES-027 SHOULD** let authors mark dates with `<time>` so machine-readable values do not depend on visual formatting.

### 27.4 Accomplishment blocks

- **FOLIO-RES-030 MUST** support compact accomplishment lists.
- **FOLIO-RES-031 MUST** support an emphasized lead phrase followed by normal-weight explanatory text within one list item.
- **FOLIO-RES-032 MUST** preserve native list semantics.
- **FOLIO-RES-033 MUST** support dense vertical rhythm without relying on unreadably small text.
- **FOLIO-RES-034 MUST** place a list's visible label before the list in source order rather than relying on visual reordering.

### 27.5 Compact metadata rows

- **FOLIO-RES-040 MUST** support rows such as project/institution/description/date where one region can grow and the terminal metadata remains aligned.
- **FOLIO-RES-041 MUST** support inline separators such as hyphens, commas, middots, or other authored separators without moving meaningful punctuation into inaccessible visual-only content where it changes meaning.
- **FOLIO-RES-042 MUST** wrap gracefully when the row cannot fit on one line.
- **FOLIO-RES-043 SHOULD** provide a general recipe or primitive usable by resumes, credentials, publications, bibliographies, case studies, and project histories.

### 27.6 Compact inline collections

- **FOLIO-RES-050 MUST** support inline compact collections such as study areas and focus areas.
- **FOLIO-RES-051 MUST** support configurable separators.
- **FOLIO-RES-052 MUST** wrap naturally and remain readable when entries exceed one line.
- **FOLIO-RES-053 MUST** preserve list semantics in source HTML when the content is logically a list.
- **FOLIO-RES-054 MUST** support an inline label/value composition (for example `Focus Areas:` followed by the collection) using native description-list or heading semantics.

### 27.7 Categorized dense grid

- **FOLIO-RES-060 MUST** reproduce the categorized technology grid using responsive CSS without JavaScript layout.
- **FOLIO-RES-061 MUST** allow a variable number of categories and entries.
- **FOLIO-RES-062 MUST** support compact category headings and lists.
- **FOLIO-RES-063 MUST** avoid clipping or overlap when category names or technology names are long.
- **FOLIO-RES-064 MUST** define print fragmentation behavior for a category block.
- **FOLIO-RES-065 MUST** collapse/reflow appropriately for narrow screen preview without changing the print-media contract.

### 27.8 Pagination and keeps

- **FOLIO-RES-070 MUST** support keep-together intent for small logical blocks.
- **FOLIO-RES-071 MUST** support heading-with-next-content keep intent where practical.
- **FOLIO-RES-072 MUST** record that keep behavior is renderer intent rather than an absolute guarantee when the block cannot fit.
- **FOLIO-RES-073 MUST** detect missing/duplicated content across page fragmentation in deterministic PDF tests.
- **FOLIO-RES-074 MUST NOT** introduce DOM measurement or manual repagination.

### 27.9 Typography and density

- **FOLIO-RES-080 MUST** permit a restrained professional typographic system equivalent to the existing Arial/Helvetica-based resume.
- **FOLIO-RES-081 MUST** expose spacing/type tokens needed for dense professional documents.
- **FOLIO-RES-082 MUST** keep hierarchy clear across h1-h5-equivalent semantic levels without requiring invalid heading structure.
- **FOLIO-RES-083 MUST** support emphasized inline lead text and italic/secondary role text.
- **FOLIO-RES-084 MUST** remain legible in print and not solve overflow by arbitrary global font shrinking.

### 27.10 Fixtures, verification, and documentation

- **FOLIO-RES-090 MUST** provide canonical fixture `RESUME-01` reproducing the reference `index.html` rendering, including its rendered text, section order, and A4/10 mm page contract.
- **FOLIO-RES-091 MUST** provide canonical fixture `RESUME-02` reproducing the reference `developer.html` composition with the same recipe vocabulary as `RESUME-01`.
- **FOLIO-RES-092 MUST** provide at least one generalized professional-profile fixture that uses different content, section types, and person to prove the recipes are not hard-coded to the reference resume.
- **FOLIO-RES-093 MUST** compare each reproduction fixture against a committed text snapshot of the reference PDF so omitted or duplicated words are detected.
- **FOLIO-RES-094 MUST** verify A4 page size, 10 mm content bounds, no horizontal overflow, header non-overlap, date alignment, date/heading non-collision, lead-phrase emphasis, grid grouping, and Letter adaptation in deterministic Chromium.
- **FOLIO-RES-095 MUST** verify narrow-screen preview at 320, 390, and 430 CSS pixels without page-level horizontal overflow, and MUST verify that print media restores the authored layout.
- **FOLIO-RES-096 MUST** record reference defects (application defects in the reference, not Folio behavior) separately from reproduction evidence and MUST NOT reproduce them in the developer fixture when they are clearly data-binding errors.
- **FOLIO-RES-097 MUST** document the Resume / Professional Profile family on the Folio site with rendered examples, semantic source, recipes used, page dimensions, capability tier, renderer limitations, and mobile behavior.
- **FOLIO-RES-098 MUST** document every public recipe with its allowed structure, tokens, fragmentation behavior, capability tier, and at least three examples, matching the obligation for public elements.
- **FOLIO-RES-099 MUST** treat Chromium-only page-box decoration (for example `@page` borders used by the reference as a page frame) as consumer styling at P2, not as a portable Folio guarantee.
