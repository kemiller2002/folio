# Object Metadata and Diagram/Workflow Print Projection Requirements

Status: proposed architecture baseline.

Tracking: #20. Related Forma presentation work: kemiller2002/forma#53 and kemiller2002/forma#52. Related Forma Studio work: kemiller2002/forma-studio#4 and PR #5.

## Purpose

Folio MUST support descriptive object metadata and reliable paged-media projection of workflow/diagram content without becoming the authority for graph semantics, workflow legality, routing, or application state.

The consuming application owns object identity, metadata values, graph topology, workflow meaning, color intent, and provenance. Forma owns reusable visual presentation where a public diagram contract exists. Folio owns printable document composition, fragmentation, page fitting/tiling, renderer capability declarations, and print-safe fallbacks.

## 1. Object metadata model

- **EPC-META-001 MUST** allow a consumer to associate descriptive metadata with any meaningful printable object or composition.
- **EPC-META-002 MUST** preserve stable consumer-supplied object IDs/references when provided.
- **EPC-META-003 MUST** keep object identity separate from visible label/text and from DOM position.
- **EPC-META-004 MUST** keep metadata separate from print geometry, visual color, pagination, and renderer implementation.
- **EPC-META-005 MUST** treat metadata as consumer-supplied; Folio MUST NOT infer or manufacture unknown metadata.
- **EPC-META-006 MUST NOT** interpret metadata as authorization, approval, severity, confidence, workflow legality, scoring, or domain truth.
- **EPC-META-007 SHOULD** support metadata for documents, sections, figures, tables, callouts, notes, code blocks, artwork layers, workflow/diagram objects, and higher-level report compositions.
- **EPC-META-008 MUST** support namespaced custom metadata without requiring Folio to know every domain field.
- **EPC-META-009 MUST** preserve a distinction between descriptive metadata, provenance, accessibility semantics, renderer diagnostics, and document configuration.
- **EPC-META-010 MUST** support Unicode and bidirectional metadata text.

## 2. Metadata visibility classes

Folio MUST distinguish metadata by intended visibility/transport.

- **EPC-META-020 MUST** support **source-only metadata** that exists for authoring/agents and is not emitted into ordinary print/PDF output.
- **EPC-META-021 MUST** support **rendered metadata** intentionally visible in the document.
- **EPC-META-022 MUST** support **export/provenance metadata** intentionally available to the export caller/manifest when the renderer contract allows it.
- **EPC-META-023 MUST** support **accessibility metadata** only through appropriate semantic/accessibility channels and MUST NOT treat hidden text as a generic metadata store.
- **EPC-META-024 MUST** require the consumer/export adapter to choose the visibility class explicitly where metadata could otherwise leak.
- **EPC-META-025 MUST** default unknown custom metadata to non-rendered/non-exported unless a contract explicitly promotes it.
- **EPC-META-026 MUST** ensure changing metadata visibility does not mutate object identity or document content semantics.

## 3. Metadata fields and typing

Folio SHOULD be able to preserve/render fields such as:

- title/name;
- description;
- type/category;
- tags;
- owner/role/team;
- phase/stage;
- status text;
- source/citation/reference;
- external ID/URL;
- version/revision;
- created/updated/display date;
- provenance/evidence identifier;
- namespaced custom fields.

- **EPC-META-040 MUST** NOT require every object to implement every field.
- **EPC-META-041 MUST** allow consumers to define object-specific metadata schemas outside Folio.
- **EPC-META-042 MUST** preserve metadata field order where the rendered presentation intentionally specifies one.
- **EPC-META-043 SHOULD** support scalar text, number, boolean, date/time, URL/reference, token/enum label, and repeated tag/list values through semantic source markup or consumer model.
- **EPC-META-044 MUST** keep the stored canonical value distinct from localized/rendered label text where the consumer makes that distinction.
- **EPC-META-045 MUST** preserve unknown values as unknown rather than rendering empty/zero/false as a guessed replacement.

## 4. Metadata privacy and export safety

- **EPC-META-060 MUST** NOT encourage credentials, secrets, access tokens, private keys, or sensitive hidden source values to be embedded in printable custom-element attributes.
- **EPC-META-061 MUST NOT** serialize source-only/suppressed metadata into PDF-visible text, generated CSS, comments, SVG metadata, HTML data attributes, accessibility-only text, diagnostics, or export manifests unless explicitly authorized by the consumer contract.
- **EPC-META-062 MUST** treat URLs and external references as untrusted consumer inputs.
- **EPC-META-063 MUST** allow confidentiality labels without implying access control.
- **EPC-META-064 MUST** keep renderer diagnostics content-minimized by default.
- **EPC-META-065 SHOULD** allow an export caller to obtain a manifest of emitted metadata categories without logging the values.
- **EPC-META-066 MUST** document that browser/PDF metadata retention varies by renderer and MUST NOT claim preservation without evidence.

## 5. Rendered metadata presentation

- **EPC-META-080 SHOULD** provide a reusable semantic recipe for object metadata based on headings, description lists, lists, links, time elements, and text.
- **EPC-META-081 SHOULD** provide compact and expanded metadata compositions without requiring separate domain-specific elements.
- **EPC-META-082 MUST** allow metadata to fragment naturally across pages unless the composition explicitly requests a keep-together policy.
- **EPC-META-083 MUST** avoid hiding essential metadata in hover/tooltips or other screen-only interaction.
- **EPC-META-084 MUST** maintain logical source/reading order independently from print placement.
- **EPC-META-085 MUST** support long values, localization, and text enlargement in screen preview.
- **EPC-META-086 SHOULD** allow selected provenance metadata to appear in running header/footer/body recipes where the consumer explicitly chooses it.
- **EPC-META-087 MUST** ensure decorative metadata badges/icons have textual equivalents when their values matter.

## 6. Diagram/workflow projection boundary

- **EPC-DIAG-001 MUST** support printing/exporting a consumer-provided diagram/workflow projection without Folio becoming the graph model.
- **EPC-DIAG-002 MUST** keep graph topology, node/edge IDs, routing semantics, ports, workflow legality, and domain validation outside Folio.
- **EPC-DIAG-003 SHOULD** prefer vector SVG and/or semantic HTML composition for diagrams when the renderer path supports it.
- **EPC-DIAG-004 MAY** support raster diagram input as a fallback, but raster-only input MUST NOT be the only supported handoff when machine-readable topology/accessibility is required.
- **EPC-DIAG-005 MUST** support a textual/structured alternative or accompanying explanation for meaningful diagrams.
- **EPC-DIAG-006 MUST** preserve the diagram's authored labels, relationship labels, legend/key, and selected rendered metadata.
- **EPC-DIAG-007 MUST** distinguish authored diagram content from editor chrome such as selection boxes, handles, guides, minimaps, validation overlays, and drag affordances.
- **EPC-DIAG-008 MUST** exclude editor chrome from ordinary document export.
- **EPC-DIAG-009 SHOULD** allow the export caller to include an explicit diagnostic/editor-state capture as a separate mode when needed.
- **EPC-DIAG-010 MUST** integrate with Forma's public diagram presentation contract when available without making Forma a Folio runtime dependency.

## 7. Workflow item color

Workflow/diagram objects MAY carry authored color, and Folio MUST preserve it where the selected output mode can do so safely.

- **EPC-COLOR-001 MUST** support consumer-provided object fill/background color.
- **EPC-COLOR-002 MUST** support object border/stroke/accent color.
- **EPC-COLOR-003 MUST** support connector/relationship stroke/accent color.
- **EPC-COLOR-004 MAY** support authored text/foreground color subject to contrast requirements.
- **EPC-COLOR-005 MUST** preserve fixed authored literal colors when the consumer declares them fixed content and the renderer supports color output.
- **EPC-COLOR-006 MUST** preserve theme/palette token references as resolved presentation from the consumer/Forma layer rather than reinterpreting their semantic meaning.
- **EPC-COLOR-007 MUST** keep color separate from workflow type/status semantics.
- **EPC-COLOR-008 MUST NOT** infer Error/Approved/Warning/Complete/etc. from color.
- **EPC-COLOR-009 MUST** allow user-authored colors that do not correspond to any semantic status.
- **EPC-COLOR-010 MAY** render metadata-to-color mappings supplied explicitly by the consumer/profile.
- **EPC-COLOR-011 MUST NOT** create its own metadata-to-color business rules.

## 8. Print-safe color fallback

- **EPC-COLOR-020 MUST** keep meaningful diagram/workflow distinctions understandable without color.
- **EPC-COLOR-021 MUST** preserve labels, icons, markers, shapes, borders, line styles, patterns, legends, or other non-color cues supplied by the presentation.
- **EPC-COLOR-022 MUST** provide grayscale-safe output expectations for canonical diagram fixtures.
- **EPC-COLOR-023 MUST** define backgrounds-disabled behavior in which node boundaries and essential labels remain visible.
- **EPC-COLOR-024 MUST** avoid white-on-white or otherwise invisible labels when authored fills disappear at print time.
- **EPC-COLOR-025 SHOULD** preserve connector categories through line style/marker/label when color disappears.
- **EPC-COLOR-026 MUST** keep selected output legible under black-and-white printer conversion where that output mode is claimed.
- **EPC-COLOR-027 MUST** test representative light/dark/color/grayscale/backgrounds-disabled variants before claiming portable diagram printing.

## 9. Diagram bounds and page fitting

- **EPC-DIAG-020 MUST** compute or accept explicit diagram content bounds independent of editor pan/zoom.
- **EPC-DIAG-021 MUST** support a fit-to-page projection mode.
- **EPC-DIAG-022 SHOULD** support actual-size/scale-preserving output when physical scale has meaning and the consumer supplies a valid unit contract.
- **EPC-DIAG-023 SHOULD** support multi-page tiling/poster output for diagrams that intentionally exceed one page.
- **EPC-DIAG-024 MUST** preview or report tiled page boundaries before deterministic export where a preview surface exists.
- **EPC-DIAG-025 MUST** NOT silently clip nodes, labels, connectors, legends, or metadata outside the selected page/content bounds.
- **EPC-DIAG-026 MUST** emit a diagnostic/blocking result when required content cannot fit under a strict export profile.
- **EPC-DIAG-027 SHOULD** support configurable padding/bleed-like safe space around diagram content without claiming true print bleed support on unsupported browser paths.
- **EPC-DIAG-028 MUST** keep page fitting a presentation/export concern and MUST NOT rewrite the underlying graph geometry.
- **EPC-DIAG-029 SHOULD** support portrait/landscape/named-page profiles for diagram sections.

## 10. Diagram fragmentation and tiling

- **EPC-DIAG-040 MUST** treat a diagram as one logical semantic object even when rendered over multiple tiled pages.
- **EPC-DIAG-041 SHOULD** avoid placing page cuts directly through critical labels/nodes when a deterministic tiling strategy can shift boundaries safely.
- **EPC-DIAG-042 MAY** repeat a compact legend/title/reference context on tiled pages through explicit consumer configuration.
- **EPC-DIAG-043 MUST** identify tile/page sequence clearly when a multi-page diagram is exported.
- **EPC-DIAG-044 SHOULD** provide overlap/crop alignment cues for poster-style tiling only when supported and useful; these cues are print decoration, not graph semantics.
- **EPC-DIAG-045 MUST** keep tile overlap/crop marks out of the canonical graph data.
- **EPC-DIAG-046 MUST** preserve a single-page vector export option when the selected renderer/output format can accommodate the complete bounds.

## 11. Legends and metadata in print

- **EPC-DIAG-060 SHOULD** support a diagram legend/key supplied by the consumer/profile.
- **EPC-DIAG-061 MUST** ensure the legend explains meaningful color/shape/line-style categories textually.
- **EPC-DIAG-062 MUST** treat a legend as presentation/communication, not as the source of graph semantics.
- **EPC-DIAG-063 SHOULD** allow object metadata to render adjacent to a node, in a side metadata table, appendix, or detail section depending on document design.
- **EPC-DIAG-064 MUST** keep object ID/reference linkage available when metadata is separated into a table/appendix.
- **EPC-DIAG-065 SHOULD** support a generated object index/table keyed by stable object ID when a consumer supplies the data.
- **EPC-DIAG-066 MUST** support omission of nonessential metadata for compact print while retaining semantic linkage in the source/manifest where authorized.

## 12. Accessibility

- **EPC-DIAG-080 MUST** preserve accessible text alternatives/descriptions for meaningful diagrams.
- **EPC-DIAG-081 MUST** preserve logical relationship/object descriptions in source HTML or an accompanying structured equivalent when PDF tagging support cannot be guaranteed.
- **EPC-DIAG-082 MUST** NOT claim that a vector diagram in a browser-generated PDF is automatically accessible/tagged.
- **EPC-DIAG-083 MUST** keep text selectable/searchable where the chosen SVG/HTML renderer path supports it.
- **EPC-DIAG-084 MUST** keep workflow meaning understandable in grayscale and without background fills.
- **EPC-DIAG-085 MUST** preserve metadata label/value association in logical source order.
- **EPC-DIAG-086 SHOULD** support an appendix/list representation of diagram nodes/relationships for long or complex diagrams.

## 13. Provenance and reproducibility

- **EPC-DIAG-100 MUST** allow the export caller to record source diagram ID/version/revision, Forma presentation version, Folio version, renderer/version, output profile, color mode, and fitting/tiling mode as non-secret provenance.
- **EPC-DIAG-101 MUST** distinguish source graph revision from rendered-document revision.
- **EPC-DIAG-102 MUST** keep provenance metadata optional/configurable so private repository or user identifiers are not leaked unintentionally.
- **EPC-DIAG-103 SHOULD** expose enough renderer diagnostics to reproduce the same projection settings.
- **EPC-DIAG-104 MUST** distinguish semantic/layout equivalence from byte-for-byte PDF equivalence.

## 14. Public primitive strategy

- **EPC-DIAG-120 MUST** first attempt diagram print composition using existing Folio primitives such as figure, layer, keep, break, columns/sidebar, note, and page profiles.
- **EPC-DIAG-121 MUST** require repeated evidence before adding a new public custom element solely for diagrams.
- **EPC-DIAG-122 MAY** introduce a public `ef-print-diagram` container if repeated fixtures show a stable reusable layout/export contract not adequately expressed by `ef-print-figure`.
- **EPC-DIAG-123 MAY** introduce diagram-specific legend/index helpers only when existing semantic HTML plus Folio recipes are demonstrably insufficient.
- **EPC-DIAG-124 MUST** keep graph semantics out of any Folio diagram element API.
- **EPC-DIAG-125 MUST** keep public print elements passive/light-DOM and useful before custom-element upgrade.
- **EPC-DIAG-126 MUST** update site metadata and include at least three examples for every newly registered public diagram-print element.

## 15. Tests and canonical fixtures

- **EPC-DIAG-140 MUST** add a small workflow fixture with at least five nodes, a decision, labeled relationships, a lane/phase context, metadata, a legend, and user-authored node colors.
- **EPC-DIAG-141 MUST** add a large/wide diagram fixture that requires fit-to-page or tiling.
- **EPC-DIAG-142 MUST** include a grayscale fixture.
- **EPC-DIAG-143 MUST** include a backgrounds-disabled fixture.
- **EPC-DIAG-144 MUST** include a metadata-rich diagram where only selected metadata is printed.
- **EPC-DIAG-145 MUST** verify that source-only metadata does not appear in ordinary output.
- **EPC-DIAG-146 MUST** verify that no required diagram content is clipped in deterministic Chromium export.
- **EPC-DIAG-147 MUST** record renderer differences for Firefox/Safari portable output.
- **EPC-DIAG-148 MUST** test Letter and A4 fitting.
- **EPC-DIAG-149 SHOULD** test poster tiling once implemented.
- **EPC-DIAG-150 MUST** verify that the workflow remains understandable without authored fill colors.
- **EPC-DIAG-151 MUST** verify stable object-reference linkage between rendered metadata/index entries and diagram object IDs in source/export data where supported.

## 16. Initial implementation slice

- **EPC-DIAG-M1-001 MUST** first prove one Forma-styled workflow/diagram embedded in a Folio document through existing figure/layout primitives where possible.
- **EPC-DIAG-M1-002 MUST** preserve authored object colors in deterministic color PDF.
- **EPC-DIAG-M1-003 MUST** produce a useful grayscale and backgrounds-disabled version of the same workflow.
- **EPC-DIAG-M1-004 MUST** render selected object metadata and prove source-only metadata is not leaked.
- **EPC-DIAG-M1-005 MUST** prove fit-to-page for Letter and A4.
- **EPC-DIAG-M1-006 MUST** leave graph storage/routing/workflow legality entirely outside Folio.
- **EPC-DIAG-M1-007 MUST** use test evidence before deciding whether `ef-print-diagram` is necessary.
