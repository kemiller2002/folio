# Echelon Print Components Architecture

Status: proposed baseline for implementation experiments  
Date: 2026-09-22

## Architectural thesis

Echelon Print Components should be a **document-intent layer over standards-based HTML/CSS**, not a browser replacement.

The component package should make professional print structure easy to declare and consistent to theme. The browser or selected paged-media renderer remains responsible for pagination. Capabilities that mainstream browsers do not implement consistently must be represented explicitly through renderer profiles rather than hidden behind JavaScript approximations.

This produces four clean layers:

```text
Application content and data
        |
        v
Semantic HTML + Echelon print primitives
        |
        v
Print CSS / design tokens / page profiles
        |
        +-------------------------+
        |                         |
        v                         v
Portable browser renderer     Enhanced renderer adapter
(P0/P1)                      (P2/P3)
        |                         |
        v                         v
Printer / browser PDF        Deterministic PDF / publishing output
```

## 1. Boundary decisions

### 1.1 Content ownership

The embedding application owns:

- document data;
- content text;
- semantic meaning;
- authorization and privacy;
- domain-specific sections;
- images and charts;
- any decision about what information belongs in the document.

The package owns:

- reusable page/layout semantics;
- print CSS;
- visual defaults and tokens;
- standard document patterns;
- feature/capability declarations;
- diagnostic behavior;
- renderer adapters where explicitly selected.

### 1.2 Pagination ownership

The package expresses pagination intent using CSS such as `@page`, named pages, `break-*`, multicolumn layout, and page-margin boxes where supported.

The package does **not** compute an array of pages by measuring DOM nodes and moving nodes between synthetic page containers as its core model. That approach creates a second layout engine and becomes brittle around fonts, tables, images, nested fragmentation, accessibility, and browser differences.

### 1.3 DOM architecture

Core print components should use **light DOM**.

Reasons:

1. Print styles and paged-media rules need document-level visibility.
2. Fragmentation should operate on the actual semantic document flow.
3. Consumers need reliable theming through the normal cascade.
4. Documents should remain meaningful before custom-element upgrade.
5. A print component library benefits more from composability than style isolation.

Shadow DOM remains appropriate for screen-only controls in a preview/configuration application, but it should not be the default container for printable content.

### 1.4 JavaScript boundary

Most document layout should be CSS.

JavaScript/TypeScript is allowed for:

- registering custom elements;
- validating/normalizing finite attributes;
- diagnostics;
- capability queries;
- generating narrowly scoped stylesheet rules when CSS cannot express a required parameter safely;
- optional print-preview UI glue.

It should not hold application state or duplicate pagination.

If the repository grows an interactive preview/configurator, application state and decisions should be F# behind Limen. Browser capability execution belongs in `src/kernel`; application state/transition logic belongs in `src/engine`.

## 2. Capability profiles

### P0: Portable browser

Target: current Chromium, Firefox, and Safari/WebKit common denominator.

Required surface:

- `@media print`;
- `@page` size and margins;
- named page profiles where tested;
- page/column fragmentation controls;
- multi-column layout;
- in-flow side panels;
- title/body/back page styling;
- standard semantic tables and figures;
- hyphenation as language-dependent progressive enhancement;
- background/page artwork implemented as document elements or element backgrounds rather than `@page` backgrounds.

P0 must never lose meaningful content simply because a richer capability is unavailable.

### P1: Chromium page-margin profile

Adds current Chromium's CSS `@page` margin boxes:

- running static header/footer regions;
- current page counter;
- total page counter;
- left/right page variants.

P1 requires controlled documentation around the browser's own automatic headers/footers.

### P2: Deterministic Chromium export

P2 is not a richer CSS vocabulary than P1. It is a **controlled output contract**:

- pinned Chromium version;
- browser-generated headers/footers disabled;
- background printing configured;
- print media selected;
- required fonts awaited;
- images/assets awaited;
- export timeout and diagnostics;
- PDF generated with known options;
- renderer version recorded with test evidence.

A P2 adapter should be separate from the core browser package so applications that only call `window.print()` do not inherit automation dependencies.

### P3: Enhanced paged-media renderer

Optional adapters may target engines such as Vivliostyle or Prince for capabilities outside mainstream browser interoperability:

- named strings and richer running content;
- target counters / page-aware TOCs;
- automatic footnotes;
- true sidenotes or page floats;
- bleed and marks;
- richer recto/verso publishing behavior;
- advanced page regions.

P3 is an integration boundary, not a reason to contaminate the portable component API with renderer-specific assumptions.

## 3. Proposed package layout

```text
src/
  components/
    document
    title-page
    section
    back-page
    header
    footer
    columns
    sidebar
    layer
    break
    keep
    callout
    figure
    table
    code
    toc
    note
  styles/
    reset.css
    foundation.css
    paged-media.css
    components.css
    utilities.css
  themes/
    neutral.css
    ...
  capabilities/
    model
    browser
  engine/
    # Limen application-side preview/configuration logic, if needed
  kernel/
    # Limen browser boundary, if needed
adapters/
  chromium/
  vivliostyle/       # only if an experiment justifies shipping it
  prince/            # only if an experiment justifies shipping it
examples/
  canonical-report/
  multicolumn/
  sidebar/
  tables/
  technical/
  rtl/
tests/
  fixtures/
  structural/
  visual/
docs/
  requirements/
  architecture/
  research/
```

The exact directories can change after experiments, but the dependency direction should remain.

## 3.1 Implemented core surface

As of Folio 0.2.0, the original core surface is registered and styled: document, title-page, section, back-page, header, footer, page-number intent, columns, sidebar, layer, break, keep, callout, figure, table, code, TOC, and note.

This does not collapse renderer tiers. In particular, repeated page-margin headers/footers, physical current/total page counters, automatic target-page TOC counters, automatic footnotes/sidenotes, bleed, and marks remain capability-specific. Core components express semantic/layout intent and preserve useful fallback content; they do not synthesize unsupported paged-media behavior.

## 3.2 Recipe layer

`DF-PRINT-2026-0004` adds a third public cascade layer, `ef-print-recipes`, after `ef-print-foundation` and `ef-print-components`. Recipes are documented class contracts applied to native elements when a reusable layout contract exists but the right host element depends on meaning (`header`, `li`, `div`, `ul`, `dl`). The first recipe family serves professional profiles: `.ef-identity`, `.ef-row`/`[data-row-end]`, `.ef-entry`, `.ef-lead-list`, `.ef-inline-list`, `.ef-labeled`, `.ef-category-grid`, and `.ef-dense` (see `docs/recipes/PROFESSIONAL-PROFILE.md`).

Recipes follow the same public-API obligations as elements: capability/maturity metadata, three documented examples, fixture evidence, and screen-only responsive rules that never change the print contract. Prefer a recipe over a new element when the layout contract does not also need an element boundary; prefer native HTML over both when no reusable layout contract exists.

## 4. Public component philosophy

Do not create custom replacements for ordinary semantic HTML.

A consumer should write normal content:

```html
<ef-print-document page-size="letter">
  <ef-print-title-page>
    <h1>Quarterly Review</h1>
    <p>Prepared for...</p>
  </ef-print-title-page>

  <ef-print-section>
    <h1>Executive summary</h1>
    <p>...</p>

    <ef-print-columns count="2">
      <p>...</p>
      <figure>...</figure>
    </ef-print-columns>
  </ef-print-section>

  <ef-print-back-page>
    <p>Contact...</p>
  </ef-print-back-page>
</ef-print-document>
```

The custom elements express print/layout semantics; headings, paragraphs, figures, tables, lists, and links stay HTML.

## 5. Styling model

Use cascade layers so responsibility is explicit:

```css
@layer ef-reset, ef-foundation, ef-components, ef-theme, ef-utilities;
```

Consumer CSS loaded after package layers must be able to override documented tokens without specificity fights.

Token families should include:

- `--ef-print-page-*`
- `--ef-print-margin-*`
- `--ef-print-font-*`
- `--ef-print-type-*`
- `--ef-print-space-*`
- `--ef-print-color-*`
- `--ef-print-rule-*`
- `--ef-print-column-*`
- `--ef-print-sidebar-*`
- `--ef-print-header-*`
- `--ef-print-footer-*`
- `--ef-print-art-*`

Tokens that can change pagination must be identified in documentation.

## 6. Page profiles

Named page CSS should represent page *types*, for example:

```css
@page ef-body {
  size: Letter portrait;
  margin: var(--ef-print-page-margin);
}

@page ef-wide {
  size: Letter landscape;
  margin: var(--ef-print-page-margin);
}

ef-print-section {
  page: ef-body;
}

ef-print-section[page="wide"] {
  page: ef-wide;
}
```

Where page dimensions or margins cannot be safely parameterized with custom properties in a target engine, the package may generate a document-scoped stylesheet from validated tokens. This must be a small explicit boundary, not a general CSS templating system.

## 7. Running content

The component API should express **intent** independently of the renderer.

Example intent:

```html
<ef-print-header>
  <span slot="left">Echelon Foundry</span>
  <span slot="right">Architecture Review</span>
</ef-print-header>

<ef-print-footer>
  <span slot="left">Confidential</span>
  <ef-print-page-number slot="right" format="page-of-pages"></ef-print-page-number>
</ef-print-footer>
```

Renderer mapping:

- P0: content is available semantically and may be rendered once/in-flow or suppressed according to documented fallback.
- P1/P2: map compatible static/generated values into Chromium page-margin boxes.
- P3: adapter may use named strings/running elements for richer dynamic content.

Section-title running headers must not be promised in P1 until an experiment proves a robust approach. Chromium's page-margin boxes do not by themselves provide the complete named-string/running-element model used by dedicated paged-media engines.

## 8. Background and artwork model

Do not use `@page { background-image: ... }` for the portable implementation because mainstream browsers do not implement page-box background descriptors.

Instead use a page/section layer primitive in document content.

The layer contract should support:

- decorative or semantic designation;
- cover/contain/tile/position;
- opacity;
- title/body/back applicability;
- watermark mode;
- full-bleed *visual* art inside the physical page box where supported;
- safe-content inset.

Important brand art should not exist only as a CSS background because browser print settings can suppress backgrounds. The deterministic P2 path can turn background graphics on, but ordinary browser printing remains user-controlled.

## 9. Columns and side panels

Native CSS multicolumn layout is the primary implementation for newspaper/report columns because it participates in fragmentation.

Portable side panels should favor in-flow layout. Candidate implementation experiments:

1. grid with main/rail columns in print;
2. block flow with logical float where appropriate;
3. multicolumn combinations.

The first experiment must specifically test page fragmentation. A layout that looks correct on a single screen page but clips or overlaps on page two is not acceptable.

True margin notes belong to P3 unless testing demonstrates a portable standards path.

## 10. Tables and wide content

Tables are a major pagination stressor and deserve dedicated behavior.

Rules:

- never solve width by making body text illegibly small;
- provide a named landscape page option;
- preserve semantic `thead`/`tbody` structure;
- test header repetition;
- allow a row to request no split but permit fallback if a row exceeds a page;
- detect or test clipping;
- allow long cell text to wrap;
- keep units and numeric alignment themeable.

Charts remain application-generated figures; the core package styles their container/caption.

## 11. Typography

Typography must optimize reading and hierarchy rather than imitate screen UI.

Defaults should favor:

- restrained body measure;
- explicit heading hierarchy;
- sufficient leading;
- stable paragraph rhythm;
- caption/metadata styles with adequate contrast;
- language-aware hyphenation where supported;
- no mandatory remote font.

Font choice changes pagination, so deterministic output must wait for fonts and regression tests must include fallback-font cases.

## 12. Accessibility architecture

Accessibility starts in source HTML.

The package must preserve:

- semantic headings and landmarks;
- table structure;
- captions;
- alt text;
- logical source order;
- `lang`;
- `dir`;
- non-color cues.

Print layout must not use CSS visual reordering that contradicts reading order.

Generated PDF accessibility is a separate output property. A semantic HTML source is necessary but is not evidence that a browser-produced PDF is tagged to PDF/UA quality. If PDF accessibility becomes a product requirement, create a renderer-specific validation track.

## 13. Capability API

A minimal capability object should be serializable and versioned:

```ts
type PrintCapabilities = {
  schemaVersion: 1;
  renderer: {
    id: string;
    version?: string;
    deterministic: boolean;
  };
  features: {
    namedPages: "guaranteed" | "best-effort" | "unsupported";
    marginBoxes: "guaranteed" | "best-effort" | "unsupported";
    currentPageCounter: "guaranteed" | "best-effort" | "unsupported";
    totalPageCounter: "guaranteed" | "best-effort" | "unsupported";
    automaticFootnotes: "guaranteed" | "best-effort" | "unsupported";
    targetPageCounters: "guaranteed" | "best-effort" | "unsupported";
    bleedAndMarks: "guaranteed" | "best-effort" | "unsupported";
    trueSidenotes: "guaranteed" | "best-effort" | "unsupported";
  };
};
```

Exact type names can change; the important decision is that capability is explicit and not inferred from package presence.

## 14. Deterministic export adapter

Recommended first adapter: Chromium.

The adapter should:

1. launch/pick a pinned tested Chromium version;
2. navigate/load document content;
3. wait for readiness contract;
4. wait for `document.fonts.ready`;
5. wait for required images;
6. switch/emulate print media if needed;
7. export with browser headers/footers disabled;
8. honor the package's page-size contract;
9. enable print backgrounds when required;
10. return diagnostics including renderer/version, duration, requested capability profile, warnings, and output metadata.

The core package must not require this adapter.

## 15. Testing architecture

Three complementary levels are required.

### Structural tests

Assert:

- generated attributes/classes/styles are correct;
- source order remains correct;
- custom element upgrade is idempotent;
- capability contracts are correct;
- no content is removed.

### Geometric PDF/browser tests

Assert:

- page count or acceptable range;
- target text exists;
- critical blocks are within printable bounds;
- no detected overlap;
- no clipped text;
- expected sections switch orientation/page type;
- page counters render where guaranteed.

### Visual regressions

Use a pinned renderer and compare canonical pages with tolerances. Pixel diffs are supporting evidence, not the only oracle.

## 16. First experiments

Implement experiments before expanding the API:

1. **PAGINATION-01:** baseline semantic HTML vs light-DOM custom elements across Chrome/Firefox/WebKit.
2. **MARGIN-01:** Chromium 131+ page-margin header/footer/page counter behavior, including title-page suppression and browser headers.
3. **COLUMN-01:** two/three columns across multiple pages with figures and explicit breaks.
4. **SIDEBAR-01:** in-flow rail alternatives under fragmentation.
5. **TABLE-01:** long tables, repeated headers, row breaks, landscape named page.
6. **ART-01:** full-page art/backgrounds enabled and disabled.
7. **FONT-01:** web-font readiness and fallback impact on pagination.
8. **ACCESS-PDF-01:** inspect what semantic/tag information Chromium PDFs retain.
9. **ENHANCED-01:** compare a canonical fixture in Chromium vs Vivliostyle; record what additional capabilities are actually valuable.
10. **THEME-01:** neutral theme readability in color, grayscale, and common color-vision simulations.

## 17. Dependency rule

A new runtime dependency must answer all four questions:

1. Which hard problem does it solve?
2. Why are platform capabilities or small local code inadequate?
3. What lifecycle/security/size burden does it introduce?
4. Can it remain behind an adapter rather than enter core?

The default answer for core should be no dependency until evidence says otherwise.

## 18. Initial decision posture

Recommended for the first implementation pass:

- **Core:** standards-based custom elements + CSS, light DOM, minimal TypeScript.
- **Stateful demo:** F# engine through Limen if/when interactive state warrants it.
- **Baseline renderer:** browser-native P0.
- **Professional deterministic renderer:** P2 headless Chromium adapter.
- **Advanced publishing:** experiment with Vivliostyle before deciding whether to ship an adapter; keep Prince as a possible commercial integration.
- **Public API:** small layout primitive set, semantic HTML for ordinary content.
- **Testing:** deterministic Chromium PDF plus portable-browser conformance.
- **Accessibility:** semantic source as non-negotiable; PDF tagging treated as a separately validated capability.

This gives applications a low-friction install path while leaving room to grow into genuinely advanced publishing without forcing every consumer to carry a publishing engine.
