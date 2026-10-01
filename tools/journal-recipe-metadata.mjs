// Site metadata for the publication recipes (DF-PRINT-2026-0005) and the
// Journal / Scholarly Publication document family (kemiller2002/folio#28).
// Recipes are generic long-form publication contracts; examples deliberately
// include non-journal uses. Every recipe carries capability, maturity,
// caution, and at least three standalone examples.

const h = (...lines) => lines.join("\n");

const family = "journals";
const category = "Publication recipe";

export const journalRecipeMetadata = {
  "ef-longform": {
    slug: "longform",
    family,
    title: "Long-form Reading Rhythm",
    selector: ".ef-longform",
    category,
    capability: "P0 portable",
    maturity: "fixture-backed",
    summary: "Document-root rhythm for dense long-form reading: justified, hyphenated paragraphs with first-line indents, heading keep-with-next, widow/orphan control, and optional lead-line small caps or drop caps.",
    caution: "Hyphenation needs a lang attribute and follows each engine's dictionaries. Justification is print-oriented; screens at 30rem or narrower switch to start alignment. Selectors use :where() so every other recipe overrides the rhythm.",
    examples: [
      {
        title: "Scholarly article body",
        note: "Indented continuation paragraphs; the first paragraph after a heading is not indented.",
        html: h(
          "<ef-print-document class=\"ef-longform\" lang=\"en\">",
          "  <section>",
          "    <h2>1 Introduction</h2>",
          "    <p>Night-time heat drives much of the health burden of urban heat, yet most street-scale studies report afternoon surface temperatures.</p>",
          "    <p>Street trees are the most widely promoted adaptation for residential areas. By day their benefits are well established; by night the picture is less clear.</p>",
          "  </section>",
          "</ef-print-document>"
        )
      },
      {
        title: "Book chapter opening with drop cap",
        note: "data-dropcap and data-lead are optional house-style hooks on the opening paragraph.",
        html: h(
          "<ef-print-document class=\"ef-longform\" lang=\"en\">",
          "  <section>",
          "    <h2>Chapter 3. The quiet hours</h2>",
          "    <p data-dropcap data-lead>Cities do not switch off at dusk. Streets cool, or fail to; lights come on and change what lives beneath them.</p>",
          "    <p>Field science has long been a daytime discipline, shaped by working hours and satellite overpasses.</p>",
          "  </section>",
          "</ef-print-document>"
        )
      },
      {
        title: "Technical report with spaced paragraphs",
        note: "Tokens turn indents off and paragraph spacing on for a report house style.",
        html: h(
          "<ef-print-document class=\"ef-longform\" lang=\"en\" style=\"--ef-print-longform-indent: 0; --ef-print-longform-paragraph-space: .6em; --ef-print-longform-align: start\">",
          "  <section>",
          "    <h2>Findings</h2>",
          "    <p>Retention did not differ by site class.</p>",
          "    <p>Calibration offsets were below 0.25 °C for every retained sensor.</p>",
          "  </section>",
          "</ef-print-document>"
        )
      }
    ]
  },

  "ef-article": {
    slug: "article",
    family,
    title: "Article Unit",
    selector: ".ef-article",
    category,
    capability: "P0 portable · recto P3",
    maturity: "fixture-backed",
    summary: "A self-contained article or chapter inside a document or issue. data-start=\"page\" begins it on a new page; data-start=\"recto\" records right-hand-page intent. Article-local heading sizes are tokens.",
    caution: "Chromium, Firefox, and WebKit treat recto as an ordinary page break; true recto starts need a P3 renderer. Give each article its own named page (consumer CSS) for P1 running heads; that forces a break at the boundary.",
    examples: [
      {
        title: "Article in an issue",
        note: "The native article landmark is labelled by its h1.",
        html: h(
          "<ef-print-document class=\"ef-longform\">",
          "  <article class=\"ef-article\" data-start=\"page\" aria-labelledby=\"a1\">",
          "    <h1 id=\"a1\">Street lighting retrofits and nocturnal insects</h1>",
          "    <h2>1 Introduction</h2>",
          "    <p>Artificial light at night alters insect behaviour.</p>",
          "  </article>",
          "</ef-print-document>"
        )
      },
      {
        title: "Proceedings paper with recto intent",
        note: "Portable renderers start a new page; a P3 renderer may insert a blank verso.",
        html: h(
          "<ef-print-document>",
          "  <article class=\"ef-article\" data-start=\"recto\" aria-labelledby=\"p7\">",
          "    <h1 id=\"p7\">Session 2, Paper 7: Sensor drift at low temperature</h1>",
          "    <p>Extended abstract.</p>",
          "  </article>",
          "</ef-print-document>"
        )
      },
      {
        title: "Manual chapter with local heading tokens",
        note: "Article-scoped tokens change section heading scale without touching the document.",
        html: h(
          "<ef-print-document>",
          "  <article class=\"ef-article\" style=\"--ef-print-article-h2-size: 1.3em\" aria-labelledby=\"m2\">",
          "    <h1 id=\"m2\">Installing the logger</h1>",
          "    <h2>Before you begin</h2>",
          "    <p>Charge the battery and record the serial number.</p>",
          "  </article>",
          "</ef-print-document>"
        )
      }
    ]
  },

  "ef-article-header": {
    slug: "article-header",
    family,
    title: "Article Front Matter",
    selector: ".ef-article-header",
    category,
    capability: "P0 portable",
    maturity: "fixture-backed",
    summary: "Opening front matter on a native header: [data-kicker] article type, h1 title, [data-subtitle], contributors, affiliations, and metadata. Spans all columns when placed inside multicolumn flow and keeps with what follows.",
    caution: "Keep-with-next is a renderer request; very long author lists may still fragment. The header is in-flow first-page treatment, not a running head.",
    examples: [
      {
        title: "Research article opening",
        note: "Kicker, title, subtitle, and authors in source order.",
        html: h(
          "<ef-print-document>",
          "  <header class=\"ef-article-header\">",
          "    <p data-kicker>Research Article · Open Access</p>",
          "    <h1>Canopy cover and nocturnal surface cooling</h1>",
          "    <p data-subtitle role=\"doc-subtitle\">Evidence from a three-city sensor network</p>",
          "    <ol class=\"ef-authors\"><li>Adaeze Okafor</li><li>Rafael Quintero</li></ol>",
          "  </header>",
          "</ef-print-document>"
        )
      },
      {
        title: "White paper title block",
        note: "The same recipe opens a non-journal publication.",
        html: h(
          "<ef-print-document>",
          "  <header class=\"ef-article-header\">",
          "    <p data-kicker>White Paper · Version 2</p>",
          "    <h1>Open data practices for citizen-assisted sensor networks</h1>",
          "    <dl class=\"ef-meta-list\"><div><dt>Published</dt><dd><time datetime=\"2026-05\">May 2026</time></dd></div></dl>",
          "  </header>",
          "</ef-print-document>"
        )
      },
      {
        title: "Header inside a two-column body",
        note: "Placed inside ef-print-columns, the header spans both columns.",
        html: h(
          "<ef-print-document>",
          "  <ef-print-columns>",
          "    <header class=\"ef-article-header\">",
          "      <p data-kicker>Brief Report</p>",
          "      <h1>Battery life of low-cost loggers on sub-zero nights</h1>",
          "    </header>",
          "    <p>Winter deployments lose data when batteries fail on cold nights.</p>",
          "    <p>Lithium cells lasted the full 60-night test.</p>",
          "  </ef-print-columns>",
          "</ef-print-document>"
        )
      }
    ]
  },

  "ef-authors": {
    slug: "authors",
    family,
    title: "Contributor List",
    selector: ".ef-authors",
    category,
    capability: "P0 portable",
    maturity: "fixture-backed",
    summary: "Native list of contributors that flows inline with a configurable separator. Affiliation and correspondence markers are links to affiliation IDs, so the mapping does not depend on visual order; [data-orcid] links stay unbroken.",
    caution: "Name order, name formatting, and equal-contribution semantics are consumer data. Give marker links an aria-label such as \"Affiliation 2\".",
    examples: [
      {
        title: "Authors with affiliation markers",
        note: "Superscript markers link to affiliation list items.",
        html: h(
          "<ef-print-document>",
          "  <ol class=\"ef-authors\" aria-label=\"Authors\">",
          "    <li><span>Adaeze Okafor</span><sup><a href=\"#aff-1\" aria-label=\"Affiliation 1\">1</a>,<a href=\"#note\" aria-label=\"Corresponding author\">*</a></sup></li>",
          "    <li><span>Tomás Lindgren-Reyes</span><sup><a href=\"#aff-2\" aria-label=\"Affiliation 2\">2</a></sup></li>",
          "  </ol>",
          "  <ol class=\"ef-affiliations\"><li id=\"aff-1\"><sup>1</sup> University of Harrowgate</li><li id=\"aff-2\"><sup>2</sup> Lindqvist Bay Institute of Technology</li></ol>",
          "  <ef-print-note id=\"note\"><p>* Corresponding author: a.okafor@example.org</p></ef-print-note>",
          "</ef-print-document>"
        )
      },
      {
        title: "Author with ORCID",
        note: "The ORCID example identity; the identifier stays on one line.",
        html: h(
          "<ef-print-document>",
          "  <ol class=\"ef-authors\">",
          "    <li><span>Josiah Carberry</span> <a data-orcid href=\"https://orcid.org/0000-0002-1825-0097\">ORCID 0000-0002-1825-0097</a></li>",
          "  </ol>",
          "</ef-print-document>"
        )
      },
      {
        title: "Report contributors with a custom separator",
        note: "--ef-print-authors-separator changes the presentational separator only.",
        html: h(
          "<ef-print-document style=\"--ef-print-authors-separator: ' ·'\">",
          "  <ul class=\"ef-authors\" aria-label=\"Prepared by\">",
          "    <li>Facilities Planning</li>",
          "    <li>Environmental Monitoring Unit</li>",
          "    <li>Office of the City Forester</li>",
          "  </ul>",
          "</ef-print-document>"
        )
      }
    ]
  },

  "ef-affiliations": {
    slug: "affiliations",
    family,
    title: "Affiliation List",
    selector: ".ef-affiliations",
    category,
    capability: "P0 portable",
    maturity: "fixture-backed",
    summary: "Compact list of affiliations with authored markers and a hanging indent, so long institution names wrap under their text. Items carry IDs that contributor markers link to.",
    caution: "Markers are authored text (sup), not generated numbering. A single affiliation may be a paragraph with the class.",
    examples: [
      {
        title: "Numbered affiliations",
        note: "Long names wrap with a hanging indent.",
        html: h(
          "<ef-print-document>",
          "  <ol class=\"ef-affiliations\" aria-label=\"Affiliations\">",
          "    <li id=\"aff-1\"><sup>1</sup> Department of Geography, University of Harrowgate, Harrowgate, Northmere</li>",
          "    <li id=\"aff-2\"><sup>2</sup> Centre for Urban Microclimate, Lindqvist Bay Institute of Technology, Lindqvist Bay, Northmere</li>",
          "  </ol>",
          "</ef-print-document>"
        )
      },
      {
        title: "Single affiliation line",
        note: "Editorials and letters often have one affiliation and no markers.",
        html: h(
          "<ef-print-document>",
          "  <p class=\"ef-affiliations\">Editor-in-Chief; Fenwick Institute for Field Methods, Port Amsel</p>",
          "</ef-print-document>"
        )
      },
      {
        title: "Symbol markers",
        note: "Proceedings that use symbols instead of numbers.",
        html: h(
          "<ef-print-document>",
          "  <ul class=\"ef-affiliations\">",
          "    <li id=\"aff-a\"><sup>†</sup> Northmere Statistical Service</li>",
          "    <li id=\"aff-b\"><sup>‡</sup> Port Amsel Climate Office</li>",
          "  </ul>",
          "</ef-print-document>"
        )
      }
    ]
  },

  "ef-meta-list": {
    slug: "meta-list",
    family,
    title: "Metadata List",
    selector: ".ef-meta-list",
    category,
    capability: "P0 portable",
    maturity: "fixture-backed",
    summary: "Generic label/value metadata on a native dl with div groups: DOI, dates, licence, citation, ISSN, publisher, version. Two aligned tracks by default; data-layout=\"inline\" runs groups together. Long identifiers wrap.",
    caution: "Each group is a div containing one dt and its dd. Folio does not validate identifiers or dates. Screens at 30rem or narrower stack labels above values.",
    examples: [
      {
        title: "Article information",
        note: "DOI, history with machine-readable dates, and licence.",
        html: h(
          "<ef-print-document>",
          "  <dl class=\"ef-meta-list\" aria-label=\"Article information\">",
          "    <div><dt>DOI</dt><dd><a href=\"https://doi.org/10.5555/fjfs.2026.1403.e0412\">https://doi.org/10.5555/fjfs.2026.1403.e0412</a></dd></div>",
          "    <div><dt>History</dt><dd>Received <time datetime=\"2025-11-03\">3 November 2025</time> · Accepted <time datetime=\"2026-06-02\">2 June 2026</time></dd></div>",
          "    <div><dt>Licence</dt><dd>CC BY 4.0</dd></div>",
          "  </dl>",
          "</ef-print-document>"
        )
      },
      {
        title: "Inline cover identifiers",
        note: "data-layout=\"inline\" for compact identifier lines on covers.",
        html: h(
          "<ef-print-document>",
          "  <dl class=\"ef-meta-list\" data-layout=\"inline\">",
          "    <div><dt>ISSN</dt><dd>0000-0019</dd></div>",
          "    <div><dt>eISSN</dt><dd>0000-0027</dd></div>",
          "    <div><dt>Publisher</dt><dd>Fenwick Academic Press</dd></div>",
          "  </dl>",
          "</ef-print-document>"
        )
      },
      {
        title: "Report colophon",
        note: "The same contract documents a technical report's version and provenance.",
        html: h(
          "<ef-print-document>",
          "  <dl class=\"ef-meta-list\" aria-label=\"Document control\">",
          "    <div><dt>Version</dt><dd>2.1 (approved)</dd></div>",
          "    <div><dt>Owner</dt><dd>Environmental Monitoring Unit</dd></div>",
          "    <div><dt>Source data</dt><dd><a href=\"https://example.org/data/network/2026/release-candidate-3/manifest.json\">https://example.org/data/network/2026/release-candidate-3/manifest.json</a></dd></div>",
          "  </dl>",
          "</ef-print-document>"
        )
      }
    ]
  },

  "ef-abstract": {
    slug: "abstract",
    family,
    title: "Abstract",
    selector: ".ef-abstract",
    category,
    capability: "P0 portable",
    maturity: "fixture-backed",
    summary: "Ruled abstract block with a small-caps label. data-variant=\"structured\" runs each part's h3 into its first paragraph (Background. …) while keeping real headings in the outline.",
    caution: "Use role=\"doc-abstract\" and a labelled heading. The run-in suffix is presentational (--ef-print-run-in-suffix); author meaningful punctuation as text.",
    examples: [
      {
        title: "Plain abstract",
        note: "One paragraph under a labelled heading.",
        html: h(
          "<ef-print-document>",
          "  <section class=\"ef-abstract\" role=\"doc-abstract\" aria-labelledby=\"abs\">",
          "    <h2 id=\"abs\">Abstract</h2>",
          "    <p>Winter deployments of low-cost loggers lose data when batteries fail on cold nights.</p>",
          "  </section>",
          "</ef-print-document>"
        )
      },
      {
        title: "Structured abstract",
        note: "Run-in part labels; each part remains a section with a heading.",
        html: h(
          "<ef-print-document>",
          "  <section class=\"ef-abstract\" data-variant=\"structured\" role=\"doc-abstract\" aria-labelledby=\"sabs\">",
          "    <h2 id=\"sabs\">Abstract</h2>",
          "    <section><h3>Background</h3> <p>Night-time heat drives much of the burden of urban heat.</p></section>",
          "    <section><h3>Methods</h3> <p>We deployed 312 loggers across 48 blocks.</p></section>",
          "    <section><h3>Results</h3> <p>More canopy was associated with faster cooling.</p></section>",
          "  </section>",
          "</ef-print-document>"
        )
      },
      {
        title: "Executive summary on a tinted surface",
        note: "Tokens restyle the block for a report.",
        html: h(
          "<ef-print-document style=\"--ef-print-abstract-surface: #eef2f3; --ef-print-abstract-padding: .12in .16in\">",
          "  <section class=\"ef-abstract\" aria-labelledby=\"sum\">",
          "    <h2 id=\"sum\">Summary</h2>",
          "    <p>The retrofit reduced insects at lamps by about a quarter. Text stays legible if backgrounds are not printed.</p>",
          "  </section>",
          "</ef-print-document>"
        )
      }
    ]
  },

  "ef-caption": {
    slug: "caption",
    family,
    title: "Caption",
    selector: ".ef-caption",
    category,
    capability: "P0 portable",
    maturity: "fixture-backed",
    summary: "Caption for figures, tables, listings, or a table's trailing notes: an emphasized [data-label] (Figure 2., Table 1.), caption text, and block [data-note] and [data-source] lines.",
    caution: "Labels and numbers are authored text; Folio never numbers objects. On a named page in Chromium 141, a <caption> on a header-repeating table can be stranded; label such tables with a preceding .ef-caption paragraph and aria-labelledby.",
    examples: [
      {
        title: "Figure caption with source",
        note: "Label, description, and attribution.",
        html: h(
          "<ef-print-document>",
          "  <ef-print-figure>",
          "    <figure id=\"fig-1\">",
          "      <svg viewBox=\"0 0 200 60\" role=\"img\" aria-label=\"Three bars of increasing height\"><rect x=\"10\" y=\"40\" width=\"40\" height=\"20\"/><rect x=\"80\" y=\"25\" width=\"40\" height=\"35\"/><rect x=\"150\" y=\"5\" width=\"40\" height=\"55\"/></svg>",
          "      <figcaption class=\"ef-caption\"><span data-label>Figure 1.</span> Cooling rate by canopy tertile. <span data-source>Source: authors' sensor network.</span></figcaption>",
          "    </figure>",
          "  </ef-print-figure>",
          "</ef-print-document>"
        )
      },
      {
        title: "Table caption and notes",
        note: "Caption above, notes below the table.",
        html: h(
          "<ef-print-document>",
          "  <ef-print-table>",
          "    <table>",
          "      <caption class=\"ef-caption\"><span data-label>Table 1.</span> Mean insects per recording.</caption>",
          "      <thead><tr><th scope=\"col\">Order</th><th scope=\"col\" data-align=\"number\">Before</th><th scope=\"col\" data-align=\"number\">After</th></tr></thead>",
          "      <tbody><tr><th scope=\"row\">Moths</th><td data-align=\"number\">7.1</td><td data-align=\"number\">4.6</td></tr></tbody>",
          "    </table>",
          "    <p class=\"ef-caption\"><span data-note>Note: twelve nights per summer.</span></p>",
          "  </ef-print-table>",
          "</ef-print-document>"
        )
      },
      {
        title: "Named-page table label",
        note: "The Chromium-safe pattern for tables on landscape or per-article named pages.",
        html: h(
          "<ef-print-document>",
          "  <ef-print-table>",
          "    <p id=\"tab-a1-label\" class=\"ef-caption\"><span data-label>Table A1.</span> Sensor intercalibration offsets.</p>",
          "    <table aria-labelledby=\"tab-a1-label\">",
          "      <thead><tr><th scope=\"col\">Sensor</th><th scope=\"col\" data-align=\"number\">Offset</th></tr></thead>",
          "      <tbody><tr><th scope=\"row\">HG-S01</th><td data-align=\"number\">−0.24</td></tr></tbody>",
          "    </table>",
          "  </ef-print-table>",
          "</ef-print-document>"
        )
      }
    ]
  },

  "ef-equation": {
    slug: "equation",
    family,
    title: "Display Equation",
    selector: ".ef-equation",
    category,
    capability: "P0 portable (MathML Core where supported)",
    maturity: "fixture-backed",
    summary: "Display equation on a native figure: consumer-supplied MathML, SVG, or HTML centered in a three-track grid with the authored number (figcaption) at the end. data-align=\"start\" left-aligns multi-line equations. Kept together; stable id for cross-references.",
    caution: "Folio does not typeset mathematics or number equations. Break long equations into lines (for example mtable) for narrow columns. On screens the math scrolls inside its track instead of widening the page.",
    examples: [
      {
        title: "Numbered MathML equation",
        note: "Centered math, number at the end, linkable id.",
        html: h(
          "<ef-print-document>",
          "  <p>Canopy fraction follows <a href=\"#eq-1\">Equation (1)</a>:</p>",
          "  <figure class=\"ef-equation\" id=\"eq-1\" aria-label=\"Equation 1\">",
          "    <math display=\"block\"><mrow><msub><mi>f</mi><mi>c</mi></msub><mo>=</mo><mfrac><msub><mi>A</mi><mtext>canopy</mtext></msub><msub><mi>A</mi><mtext>block</mtext></msub></mfrac></mrow></math>",
          "    <figcaption>(1)</figcaption>",
          "  </figure>",
          "</ef-print-document>"
        )
      },
      {
        title: "Multi-line model, start aligned",
        note: "mtable breaks a long model into lines for a column.",
        html: h(
          "<ef-print-document>",
          "  <figure class=\"ef-equation\" id=\"eq-3\" data-align=\"start\" aria-label=\"Equation 3\">",
          "    <math display=\"block\"><mtable columnalign=\"left\">",
          "      <mtr><mtd><mrow><mi>C</mi><mo>=</mo><msub><mi>β</mi><mn>0</mn></msub><mo>+</mo><msub><mi>β</mi><mn>1</mn></msub><mi>f</mi></mrow></mtd></mtr>",
          "      <mtr><mtd><mrow><mo>+</mo><msub><mi>β</mi><mn>2</mn></msub><mi>I</mi><mo>+</mo><mi>ε</mi></mrow></mtd></mtr>",
          "    </mtable></math>",
          "    <figcaption>(3)</figcaption>",
          "  </figure>",
          "</ef-print-document>"
        )
      },
      {
        title: "Consumer-rendered formula",
        note: "An accessible HTML formula from an upstream renderer, laid out by the same contract.",
        html: h(
          "<ef-print-document>",
          "  <figure class=\"ef-equation\" id=\"eq-r\" aria-label=\"Formula R1\">",
          "    <p><var>Δ</var> = (<var>Y</var><sub>after</sub> − <var>Y</var><sub>before</sub>)<sub>impact</sub> − (<var>Y</var><sub>after</sub> − <var>Y</var><sub>before</sub>)<sub>control</sub></p>",
          "    <figcaption>(R1)</figcaption>",
          "  </figure>",
          "</ef-print-document>"
        )
      }
    ]
  },

  "ef-column-span": {
    slug: "column-span",
    family,
    title: "Column Span",
    selector: ".ef-column-span",
    category,
    capability: "P0 portable (column-span: all)",
    maturity: "fixture-backed",
    summary: "Full-width material inside multicolumn flow: a figure, table, callout, or heading that spans every column, with column text continuing before and after it in source order.",
    caution: "Applies only to blocks in the multicolumn flow (not inside another formatting context such as a grid). A spanning element cannot carry a named page; move genuinely wide tables to a named landscape page outside the columns.",
    examples: [
      {
        title: "Wide figure in a two-column article",
        note: "The figure spans; text resumes in two columns after it.",
        html: h(
          "<ef-print-document>",
          "  <ef-print-columns>",
          "    <p>Blocks cooled at a mean of 0.33 °C per hour between sunset and 04:00.</p>",
          "    <ef-print-figure class=\"ef-column-span\">",
          "      <figure><svg viewBox=\"0 0 400 40\" role=\"img\" aria-label=\"Wide timeline\"><rect x=\"0\" y=\"15\" width=\"400\" height=\"10\"/></svg>",
          "        <figcaption class=\"ef-caption\"><span data-label>Figure 2.</span> A wide figure spanning both columns.</figcaption></figure>",
          "    </ef-print-figure>",
          "    <p>Cooling was fastest in the most exposed city.</p>",
          "  </ef-print-columns>",
          "</ef-print-document>"
        )
      },
      {
        title: "Spanning summary table",
        note: "A review's study table spans both columns.",
        html: h(
          "<ef-print-document>",
          "  <ef-print-columns>",
          "    <p>Studies used at least nine indicators.</p>",
          "    <ef-print-table class=\"ef-column-span\">",
          "      <table><caption class=\"ef-caption\"><span data-label>Table 1.</span> Indicator families.</caption>",
          "        <thead><tr><th scope=\"col\">Family</th><th scope=\"col\" data-align=\"number\">Studies</th><th scope=\"col\">Limitation</th></tr></thead>",
          "        <tbody><tr><th scope=\"row\">Equivalent level</th><td data-align=\"number\">71</td><td>Hides short loud events</td></tr></tbody></table>",
          "    </ef-print-table>",
          "    <p>Definitions of night varied as much as indicators.</p>",
          "  </ef-print-columns>",
          "</ef-print-document>"
        )
      },
      {
        title: "Spanning part heading in a newsletter",
        note: "A heading that opens a new run of columns.",
        html: h(
          "<ef-print-document>",
          "  <ef-print-columns style=\"--ef-print-column-count: 3\">",
          "    <p>Network news from the first quarter.</p>",
          "    <h2 class=\"ef-column-span\">Field notes</h2>",
          "    <p>Three loggers were replaced after storm damage.</p>",
          "  </ef-print-columns>",
          "</ef-print-document>"
        )
      }
    ]
  },

  "ef-reference-list": {
    slug: "reference-list",
    family,
    title: "Reference List",
    selector: ".ef-reference-list",
    category,
    capability: "P0 portable",
    maturity: "fixture-backed",
    summary: "Bibliography layout on a native list: hanging indent for author-year styles, or data-style=\"numeric\" with authored [data-marker] labels in a hanging gutter. Long DOIs and URLs wrap anywhere; entries request keep-together.",
    caution: "Folio does not format, sort, or validate references and claims no APA, Chicago, IEEE, or Vancouver conformance. Citation processors (CSL and similar) run upstream.",
    examples: [
      {
        title: "Numeric references",
        note: "Authored [n] markers match authored inline citations.",
        html: h(
          "<ef-print-document>",
          "  <ol class=\"ef-reference-list\" data-style=\"numeric\">",
          "    <li id=\"ref-1\"><span data-marker>[1]</span> Arden P, Whitcombe S, Laine R. Nocturnal heat retention in compact low-rise neighbourhoods: a review of field campaigns, 1995–2020. Fenwick J Field Sci. 2021;9(2):44–71. doi:<a href=\"https://doi.org/10.5555/fjfs.2021.0902\">10.5555/fjfs.2021.0902</a></li>",
          "    <li id=\"ref-2\"><span data-marker>[2]</span> Okafor A, Hartono M-L. Low-cost temperature loggers for street-scale monitoring. Tech Rep. 2023;17:1–38.</li>",
          "  </ol>",
          "</ef-print-document>"
        )
      },
      {
        title: "Author-year bibliography",
        note: "Unordered list with hanging indent; a very long URL wraps inside the column.",
        html: h(
          "<ef-print-document>",
          "  <ul class=\"ef-reference-list\">",
          "    <li id=\"bexley-2021\">Bexley, N. (2021) ‘A gentle introduction to crossed random effects’, <cite>Statistics for Field Science</cite>, 15, pp. 1–24.</li>",
          "    <li id=\"whitcombe-2021\">Whitcombe, S. and Laine, R. (2021) ‘Insect attraction to lamps of different colour temperature’. Available at: <a href=\"https://example.org/uml/2021/6/1/supplementary-material/insect-attraction-meta-analysis-extraction-sheet-version-3.csv\">https://example.org/uml/2021/6/1/supplementary-material/insect-attraction-meta-analysis-extraction-sheet-version-3.csv</a>.</li>",
          "  </ul>",
          "</ef-print-document>"
        )
      },
      {
        title: "Two-column bibliography",
        note: "References flow through ef-print-columns; entries avoid splitting.",
        html: h(
          "<ef-print-document>",
          "  <section role=\"doc-bibliography\" aria-labelledby=\"refs\">",
          "    <h2 id=\"refs\">References</h2>",
          "    <ef-print-columns>",
          "      <ol class=\"ef-reference-list\" data-style=\"numeric\">",
          "        <li><span data-marker>[1]</span> Laine R. Wind sheltering by street trees. Fenwick J Field Sci. 2020;8(1):33–47.</li>",
          "        <li><span data-marker>[2]</span> Tanaka H. Seasonal leaf-area dynamics of street trees. Remote Sens Cities. 2023;5(1):12–29.</li>",
          "        <li><span data-marker>[3]</span> Bexley N. Crossed random effects. Stat Field Sci. 2021;15:1–24.</li>",
          "      </ol>",
          "    </ef-print-columns>",
          "  </section>",
          "</ef-print-document>"
        )
      }
    ]
  },

  "ef-endnotes": {
    slug: "endnotes",
    family,
    title: "Endnotes",
    selector: ".ef-endnotes",
    category,
    capability: "P0 portable · footnotes P3",
    maturity: "fixture-backed",
    summary: "Authored in-flow notes on a native ordered list, with optional [data-backlink] links back to the reference point. Serves endnotes and note-style (notes-bibliography) citations.",
    caution: "Bottom-of-page footnotes are not provided: Chromium, Firefox, and WebKit do not implement float: footnote, and Folio does not move notes by measuring the DOM. See JOURNAL-ENHANCED-01 for the P3 comparison.",
    examples: [
      {
        title: "Lettered endnotes with backlinks",
        note: "type=\"a\" letters the notes; references use role=\"doc-noteref\".",
        html: h(
          "<ef-print-document>",
          "  <p>Studies rarely separated canopy from sky view.<sup><a href=\"#n1\" id=\"r1\" role=\"doc-noteref\">a</a></sup></p>",
          "  <section role=\"doc-endnotes\" aria-labelledby=\"notes\">",
          "    <h2 id=\"notes\">Notes</h2>",
          "    <ol class=\"ef-endnotes\" type=\"a\">",
          "      <li id=\"n1\"><p>Sky view factor is the visible fraction of the overhead hemisphere.</p> <a href=\"#r1\" data-backlink role=\"doc-backlink\" aria-label=\"Back to note a\">↩</a></li>",
          "    </ol>",
          "  </section>",
          "</ef-print-document>"
        )
      },
      {
        title: "Note-style citations",
        note: "Notes-bibliography citations authored by an upstream processor.",
        html: h(
          "<ef-print-document>",
          "  <ol class=\"ef-endnotes\">",
          "    <li id=\"c1\"><p>Dorian Larkspur, “Heat Health Warning Thresholds,” <cite>Public Health Field Reports</cite> 22 (2024): 60–79.</p></li>",
          "    <li id=\"c2\"><p>Ibid., 64.</p></li>",
          "  </ol>",
          "</ef-print-document>"
        )
      },
      {
        title: "Report notes with a long link",
        note: "A long URL wraps inside the note.",
        html: h(
          "<ef-print-document>",
          "  <ol class=\"ef-endnotes\">",
          "    <li><p>Extraction form: <a href=\"https://example.org/fjfs/14/4/e0502/supplementary/extraction-form-and-included-studies.pdf\">https://example.org/fjfs/14/4/e0502/supplementary/extraction-form-and-included-studies.pdf</a>.</p></li>",
          "  </ol>",
          "</ef-print-document>"
        )
      }
    ]
  },

  "ef-declarations": {
    slug: "declarations",
    family,
    title: "Declaration Group",
    selector: ".ef-declarations",
    category,
    capability: "P0 portable",
    maturity: "fixture-backed",
    summary: "Back-matter statements as sections with run-in h3 labels in compact type: acknowledgements, funding, competing interests, contributions, data and code availability, ethics, supplementary material. Each statement requests keep-together.",
    caution: "Statements are consumer-authored; Folio never infers or completes them. Use role=\"doc-acknowledgments\" where it applies.",
    examples: [
      {
        title: "Journal declarations",
        note: "Funding, interests, and data availability.",
        html: h(
          "<ef-print-document>",
          "  <section class=\"ef-declarations\" aria-labelledby=\"decl\">",
          "    <h2 id=\"decl\">Declarations</h2>",
          "    <section><h3>Funding</h3> <p>Northmere Research Council grant NRC-UC-2022-117.</p></section>",
          "    <section><h3>Competing interests</h3> <p>None declared.</p></section>",
          "    <section><h3>Data availability</h3> <p><a href=\"https://doi.org/10.5555/fdr.2026.ncool\">https://doi.org/10.5555/fdr.2026.ncool</a></p></section>",
          "  </section>",
          "</ef-print-document>"
        )
      },
      {
        title: "Report disclosures",
        note: "The same contract for a white paper's disclosures.",
        html: h(
          "<ef-print-document>",
          "  <section class=\"ef-declarations\" aria-labelledby=\"disc\">",
          "    <h2 id=\"disc\">Disclosures</h2>",
          "    <section><h3>Sponsorship</h3> <p>Prepared at the request of the city council.</p></section>",
          "    <section><h3>Review</h3> <p>Reviewed by two external specialists.</p></section>",
          "  </section>",
          "</ef-print-document>"
        )
      },
      {
        title: "Colon suffix house style",
        note: "--ef-print-run-in-suffix changes the presentational suffix.",
        html: h(
          "<ef-print-document style=\"--ef-print-run-in-suffix: ':'\">",
          "  <section class=\"ef-declarations\" aria-labelledby=\"ack\">",
          "    <h2 id=\"ack\">Acknowledgements</h2>",
          "    <section role=\"doc-acknowledgments\"><h3>Field team</h3> <p>We thank residents for permitting sensor installation.</p></section>",
          "  </section>",
          "</ef-print-document>"
        )
      }
    ]
  }
};

export const journalFamily = [
  {
    id: "JOURNAL-ARTICLE-01",
    slug: "journal-article-01",
    title: "Standalone research article",
    fixture: "tests/fixtures/journal/article-01.html",
    stylesheet: "tests/fixtures/journal/journal.css",
    summary: "A fictional two-column research article: opening furniture, kicker, title and subtitle, five authors mapped to four affiliations, ORCID, corresponding author, DOI, dates, licence, structured abstract, keywords, numbered sections, kept and spanning figures, three MathML equations, a code listing, a multi-page table with repeated headers, a boxed limitations callout, declarations, endnotes with backlinks, thirty numeric references in two columns, and a landscape appendix table.",
    page: "US Letter portrait plus one Letter landscape page",
    pages: "8",
    primitives: ["ef-print-document", "ef-print-header", "ef-print-columns", "ef-print-figure", "ef-print-table", "ef-print-code", "ef-print-callout", "ef-print-note", "ef-print-keep"],
    recipes: [".ef-longform", ".ef-article", ".ef-article-header", ".ef-authors", ".ef-affiliations", ".ef-meta-list", ".ef-abstract", ".ef-labeled", ".ef-inline-list", ".ef-caption", ".ef-equation", ".ef-column-span", ".ef-declarations", ".ef-endnotes", ".ef-reference-list"],
    capability: "P0 layout · P1 running heads and Page X of Y · P2 deterministic Chromium PDF evidence",
    limitations: "Running heads and Page X of Y are Chromium margin boxes (P1/P2); other renderers show only the in-flow opening header. The opening page suppresses the running head with @page :first, which only works because the article is the document's first page. Hyphenation and justification vary by engine. Text-extraction order of MathML and SVG labels is renderer-dependent. The PDF is not tagged.",
    mobile: "Two columns collapse to one at 48rem; metadata stacks, body text stops justifying, and equations drop their centering gutter at 30rem; wide tables scroll inside their wrapper. Print keeps the Letter layout."
  },
  {
    id: "JOURNAL-ISSUE-01",
    slug: "journal-issue-01",
    title: "Complete journal issue",
    fixture: "tests/fixtures/journal/issue-01.html",
    stylesheet: "tests/fixtures/journal/journal.css",
    summary: "A fictional 18-page themed issue: cover, masthead with editorial board and publication facts, contents with authored page values, a one-column editorial, three division pages, a research article with author-year references, a review with note-style citations and a spanning table, a brief report with numeric references, a letter, information for authors, a corrigendum, a sponsor page, and a back cover.",
    page: "US Letter portrait",
    pages: "18",
    primitives: ["ef-print-document", "ef-print-title-page", "ef-print-section", "ef-print-back-page", "ef-print-header", "ef-print-toc", "ef-print-columns", "ef-print-figure", "ef-print-table", "ef-print-callout", "ef-print-note"],
    recipes: [".ef-longform", ".ef-article", ".ef-article-header", ".ef-authors", ".ef-affiliations", ".ef-meta-list", ".ef-abstract", ".ef-category-grid", ".ef-labeled", ".ef-inline-list", ".ef-caption", ".ef-equation", ".ef-column-span", ".ef-declarations", ".ef-endnotes", ".ef-reference-list"],
    capability: "P0 composition · P1 per-article running heads and continuous Page X of Y · P2 deterministic Chromium PDF evidence",
    limitations: "Each article has its own named page so Chromium can show its running head; that forces a page break at every article boundary and cannot suppress the head on an article's first page (Chromium does not match @page name:first). Contents page values are authored for Chromium 141 and must be regenerated after recomposition. Recto starts, running strings, target-page references, and footnotes need a P3 renderer. Three Chromium 141 defects are worked around in consumer CSS and recorded in EV-PRINT-2026-0007.",
    mobile: "Covers and division pages lose their fixed page heights; every article reflows to one column with the same recipe behavior as the standalone article. Print keeps the Letter issue."
  }
];
