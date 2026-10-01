# Journal and scholarly publication

Status: canonical consumer guide for the Journal / Scholarly Publication family.
Work item: `kemiller2002/folio#28` (`GH-28`). Requirements: `FOLIO-JRN-001`..`260`
(`docs/requirements/PRINT-COMPONENTS-REQUIREMENTS.md` §29). Decision:
`DF-PRINT-2026-0005`. Evidence: `EV-PRINT-2026-0007`, `EV-PRINT-2026-0008`.

Folio journal HTML is an **open composition contract**: ordinary semantic HTML,
existing Folio elements, and public recipe classes. There is no journal file
format, no journal element, and no build step. The HTML is the publication
artifact; it prints, exports to PDF, and works as a normal web page.

## Who owns what

| Concern | Owner |
| --- | --- |
| Article text, metadata, identifiers, author and affiliation data | Consumer |
| Section, figure, table, equation, reference, and page-range numbers | Consumer (authored text) |
| Citation formatting and bibliographic correctness (CSL or similar) | Consumer, upstream |
| JATS, Markdown, or domain-model conversion | Consumer, upstream |
| Mathematics typesetting (MathML, SVG, accessible HTML) | Consumer, upstream |
| DOI registration, peer review, editorial workflow, declarations | Consumer |
| Reusable publication layout (recipes, elements, print CSS) | Folio |
| Journal identity: fonts, page size, margins, running-head text, covers | Consumer CSS |
| Pagination, fragmentation, physical page numbers | Browser or selected renderer |
| Running strings, footnotes, target pages, recto, bleed | P3 renderer only |

Folio never generates, infers, validates, or completes scholarly content.

## Recipes

All live in the `ef-print-recipes` layer of `src/styles/print.css`, after the
component layer, so unlayered consumer CSS always wins. Each has three examples
on the Folio site.

| Recipe | Host | Contract |
| --- | --- | --- |
| `.ef-longform` | document root | Justified, hyphenated paragraphs with first-line indents; heading keep-with-next; widows/orphans; optional `p[data-lead]` (small-caps first line) and `p[data-dropcap]`. Tokens: `--ef-print-longform-*`. Uses `:where()` so other recipes win. |
| `.ef-article` | `article` | Article/chapter unit. `data-start="page"` new page; `data-start="recto"` recto intent (page break in browsers, recto in P3). Heading-size tokens. |
| `.ef-article-header` | `header` | Opening front matter: `[data-kicker]`, `h1`, `[data-subtitle]`, contributors, metadata. Spans columns; keeps with next. |
| `.ef-authors` | `ol`/`ul` | Inline contributor list, separator token, linked affiliation markers, `[data-orcid]`. |
| `.ef-affiliations` | `ol`/`ul`/`p` | Affiliations with authored markers and hanging indent; items carry IDs. |
| `.ef-meta-list` | `dl` with `div` groups | Label/value metadata (DOI, dates, licence, citation, ISSN). `data-layout="inline"` for compact lines. Generic: report colophons too. |
| `.ef-abstract` | `section` | Ruled abstract; `data-variant="structured"` runs part headings in. |
| `.ef-caption` | `figcaption`, `caption`, `p` | `[data-label]`, `[data-note]`, `[data-source]`. |
| `.ef-equation` | `figure` | Consumer math centered, authored number in `figcaption` at the end; `data-align="start"`. |
| `.ef-column-span` | any block in multicolumn flow | `column-span: all`. |
| `.ef-reference-list` | `ol`/`ul` | Hanging indent (author-year) or `data-style="numeric"` with authored `[data-marker]`; long URLs wrap. |
| `.ef-endnotes` | `ol` | Authored notes with optional `[data-backlink]`. |
| `.ef-declarations` | `section` | Run-in statements (funding, interests, contributions, data, ethics). |

Reused without new names: keywords are `dl.ef-labeled` + `ul.ef-inline-list`;
editorial boards are `.ef-category-grid`; author notes are `ef-print-note`;
in-flow opening lines are `ef-print-header`; issue contents are `ef-print-toc`,
whose entries may carry a `[data-detail]` line (authors, article type).

## Canonical article structure

```html
<html lang="en" dir="ltr">
<body>
<ef-print-document class="ef-longform">
<article class="ef-article" id="article" aria-labelledby="article-title">
  <ef-print-header>                         <!-- in-flow opening furniture -->
    <span slot="left">Journal name</span>
    <span slot="center">Volume · Issue · Date</span>
    <span slot="right">Article ID · pages</span>
  </ef-print-header>
  <header class="ef-article-header">
    <p data-kicker>Research Article</p>
    <h1 id="article-title">Full title</h1>
    <p data-subtitle role="doc-subtitle">Subtitle</p>
    <ol class="ef-authors" aria-label="Authors">
      <li><span>Name</span><sup><a href="#aff-1" aria-label="Affiliation 1">1</a></sup></li>
    </ol>
    <ol class="ef-affiliations" aria-label="Affiliations">
      <li id="aff-1"><sup>1</sup> Institution</li>
    </ol>
    <ef-print-note id="author-notes"><p>* Corresponding author …</p></ef-print-note>
    <dl class="ef-meta-list" aria-label="Article information">
      <div><dt>DOI</dt><dd><a href="https://doi.org/…">https://doi.org/…</a></dd></div>
      <div><dt>History</dt><dd>Received <time datetime="2026-01-02">2 January 2026</time> …</dd></div>
      <div><dt>Licence</dt><dd>…</dd></div>
    </dl>
  </header>
  <section class="ef-abstract" data-variant="structured" role="doc-abstract" aria-labelledby="abs">
    <h2 id="abs">Abstract</h2>
    <section><h3>Background</h3> <p>…</p></section>
  </section>
  <dl class="ef-labeled"><dt>Keywords</dt><dd><ul class="ef-inline-list">…</ul></dd></dl>
  <ef-print-columns>
    <section id="sec-1" aria-labelledby="sec-1-title"><h2 id="sec-1-title">1 Introduction</h2> …</section>
    <ef-print-figure class="ef-column-span"><figure id="fig-2">…<figcaption class="ef-caption">…</figcaption></figure></ef-print-figure>
    <figure class="ef-equation" id="eq-1"><math display="block">…</math><figcaption>(1)</figcaption></figure>
  </ef-print-columns>
  <section> <!-- full-width region between column runs: long tables --> </section>
  <section class="ef-declarations" aria-labelledby="decl">…</section>
  <section role="doc-endnotes" aria-labelledby="notes"><h2 id="notes">Notes</h2><ol class="ef-endnotes">…</ol></section>
  <section role="doc-bibliography" aria-labelledby="refs">
    <h2 id="refs">References</h2>
    <ef-print-columns><ol class="ef-reference-list" data-style="numeric">…</ol></ef-print-columns>
  </section>
  <section class="appendix-landscape" role="doc-appendix">…</section> <!-- outside columns -->
</article>
</ef-print-document>
```

See `tests/fixtures/journal/article-01.html` for the complete reference.

## Canonical issue structure

```text
ef-print-document.ef-longform
├─ ef-print-title-page          cover (named page without running matter)
├─ ef-print-section             masthead: .ef-category-grid board, .ef-meta-list facts
├─ ef-print-section             contents: ef-print-toc with authored [data-page]
├─ article.ef-article[data-start=page]   editorial (one column)
├─ ef-print-section             division page ("Research Articles")
├─ article.ef-article[data-start=page]   research article (two columns)
├─ …                            further divisions and articles (reviews, letters)
├─ ef-print-section             back matter: information for authors, corrigenda
├─ ef-print-section             sponsor/advertisement page (ordinary named page)
└─ ef-print-back-page           back cover
```

IDs must be unique across the issue: prefix article-local IDs (`a-fig-1`,
`b-ref-3`). Special issues, supplements, and proceedings use the same
composition with different division pages and metadata. See
`tests/fixtures/journal/issue-01.html`.

## Numbering, cross-references, and pages

- Write numbers as text: `1 Introduction`, `Figure 2.`, `(3)`, `[12]`. Folio does
  not use CSS counters for scholarly numbering, so authored cross-reference text
  cannot disagree with the label.
- Cross-references are ordinary links to stable IDs (`<a href="#fig-2">Figure 2</a>`).
- "See Figure 2 on page 7" needs `target-counter()`, which only P3 renderers
  implement. Do not estimate page numbers with JavaScript.
- **Authored page values** (contents pages, article page ranges, citation
  strings) are consumer data. **Physical page numbers** are the renderer's
  `counter(page)`. If authored values must match the print edition, regenerate
  them from a deterministic render and record which renderer produced them
  (JOURNAL-ISSUE-01 uses `data-pages-rendered-with` on `ef-print-toc`).

## Citations and bibliography

Folio presents references; it does not process them. Run CSL (or another
processor) upstream and emit finished HTML: inline citations as links
(`role="doc-biblioref"`) and entries as list items with IDs. Numeric styles
use `data-style="numeric"` and authored `[data-marker]`; author-year styles use
the default hanging layout; note styles put citations in `.ef-endnotes`. Folio
claims no APA, Chicago, IEEE, MLA, or Vancouver conformance.

## Equations

Supply MathML Core, SVG, or accessible HTML. Folio centers it, places the
authored number, keeps it together, and contains overflow on screens. Break
long equations into lines (for example `mtable`) for narrow columns. No math
runtime is part of Folio.

## Notes

P0: authored endnotes (`.ef-endnotes`) with `role="doc-noteref"` references and
`[data-backlink]` back-links. True bottom-of-page footnotes are P3 only
(`float: footnote`; observed under Vivliostyle in JOURNAL-ENHANCED-01). Folio
never moves notes by measuring layout.

## Running matter by capability tier

| Need | P0 portable | P1/P2 Chromium | P3 (experimental) |
| --- | --- | --- | --- |
| Journal name, volume, issue | in-flow `ef-print-header` on the opening | static margin boxes in `@page` | same, or running strings |
| Article short title / authors | in-flow only | one named page per article with static text (forces a break per article) | `string-set` + `string()` |
| First page different | in-flow opening header | document first page only (`@page :first`) | `string(…, first-except)` |
| No running matter on covers/divisions | n/a | named page with `content: none` | same, plus `@page :blank` |
| Page X of Y | no | `counter(page)` of `counter(pages)`, continuous across named pages | same |

## Figures, tables, wide content

- `ef-print-figure` keeps artwork and caption together; add `.ef-column-span`
  for full-width figures in columns.
- Long tables: put them in full-width regions between column runs; `thead`
  repeats per page.
- Genuinely wide tables: a named landscape page outside any multicolumn
  container. Never shrink text to fit.
- Chromium 141: on a named page, label header-repeating tables with a
  preceding `.ef-caption` paragraph and `aria-labelledby` instead of `<caption>`
  (a captioned table there stranded its caption).

## Known Chromium 141 behaviors (consumer workarounds)

1. `@page` specificity is not applied across stylesheets: keep page-furniture
   rules ordered general → named in one sheet, or restate named rules last.
2. Captioned, header-repeating tables on named pages strand the caption (see above).
3. A positioned/isolated back page painted its border on the previous page
   in the issue fixture; set `position: static; isolation: auto` on back pages
   without artwork layers (follow-up WI-0001).

## Screen and mobile

The same document is a web page. At 48rem columns collapse to one; at 30rem
metadata stacks, body text stops justifying, and equations drop their centering
gutter; tables and equations scroll inside their containers; long DOIs and URLs
wrap. Print media restores the authored layout. No JavaScript is involved.

## Accessibility

Use `lang`/`dir`, one labelled `article` landmark per article, unskipped
heading levels, `figcaption`/`caption` or `aria-labelledby` labels, DPUB-ARIA
roles (`doc-abstract`, `doc-bibliography`, `doc-endnotes`, `doc-noteref`,
`doc-backlink`, `doc-biblioref`, `doc-subtitle`, `doc-acknowledgments`,
`doc-appendix`), meaningful link text, and textual equivalents for charts.
Semantic HTML does not make a PDF tagged or PDF/UA conformant; that needs
separate renderer evidence (`EX-PRINT-2026-0007`).

## Interchange: generating Folio journal HTML upstream

Conversions are consumer tools; none is a Folio dependency.

| Source | Mapping to Folio HTML |
| --- | --- |
| JATS `article-meta` | `title-group/article-title` → `h1`; `subtitle` → `[data-subtitle]`; `contrib-group/contrib` → `.ef-authors li`; `xref ref-type="aff"` → marker links; `aff` → `.ef-affiliations li[id]`; `contrib-id[@contrib-id-type="orcid"]` → `a[data-orcid]`; `article-id[@pub-id-type="doi"]`, `history/date`, `permissions` → `.ef-meta-list`; `kwd-group` → keywords `.ef-labeled`; `subj-group` → `[data-kicker]` |
| JATS body | `abstract` (with `sec`) → `.ef-abstract[data-variant=structured]`; `sec/title` → headings with authored labels; `fig` → `ef-print-figure > figure` + `.ef-caption`; `table-wrap` → `ef-print-table` (+ `table-wrap-foot` → `[data-note]`); `disp-formula` → `.ef-equation` (keep MathML); `fn-group` → `.ef-endnotes`; `ref-list` → `.ef-reference-list`; `ack`, `funding-group`, COI/data statements → `.ef-declarations`; `app` → appendix section |
| Markdown + front matter | Front matter fields → header/meta-list markup; headings → sections; Pandoc/CSL renders citations and the bibliography; footnotes → `.ef-endnotes`; math → MathML |
| Application/domain model | Render the same structure from a template; keep numbering and citation strings in the model |
| CSL processors | Emit citation text and bibliography entries as finished HTML; Folio styles them only |

## Verification

`npm run test:journal` (fixtures, all engines; part of `npm test`),
`npm run site:check`, `npm run site:test:browser`, and optionally
`npm run experiment:journal-enhanced` with an out-of-tree Vivliostyle install.
