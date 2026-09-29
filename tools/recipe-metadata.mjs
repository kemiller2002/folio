// Site metadata for public Folio recipes (DF-PRINT-2026-0004) and the
// Resume / Professional Profile document family (kemiller2002/folio#17).
// Every recipe carries the same obligations as a public element: capability,
// maturity, caution, and at least three standalone examples.

const h = (...lines) => lines.join("\n");

export const recipeMetadata = {
  "ef-identity": {
    slug: "identity",
    title: "Identity Header",
    selector: ".ef-identity",
    category: "Professional profile recipe",
    capability: "P0 portable",
    maturity: "fixture-backed",
    summary: "A dominant identity region (name, optional tagline) beside a compact contact region that stacks. data-contact=\"inline\" wraps contacts in a row beneath the identity.",
    caution: "The first child is the identity region; the next child (address or list) is the contact region. Screens at 48rem or narrower stack the regions; print keeps the authored layout.",
    examples: [
      {
        title: "Centered name, stacked contacts",
        note: "The executive resume header: name centered in the growing region, contacts stacked at the end.",
        html: h(
          "<ef-print-document class=\"ef-dense\">",
          "  <header class=\"ef-identity\">",
          "    <h1>Jordan Alvarez</h1>",
          "    <address>",
          "      <span>555.010.2233</span>",
          "      <a href=\"mailto:jordan@example.com\">jordan@example.com</a>",
          "      <a href=\"https://example.com\">https://example.com</a>",
          "    </address>",
          "  </header>",
          "  <p>Platform engineering leader focused on delivery reliability.</p>",
          "</ef-print-document>"
        )
      },
      {
        title: "Speaker sheet with inline contacts",
        note: "Left-aligned identity with a tagline; contacts wrap in one row underneath.",
        html: h(
          "<ef-print-document class=\"ef-dense\" style=\"--ef-print-identity-align: start\">",
          "  <header class=\"ef-identity\" data-contact=\"inline\">",
          "    <div>",
          "      <h1>Priya Natarajan</h1>",
          "      <p>Keynote speaker · accessible data visualization</p>",
          "    </div>",
          "    <address>",
          "      <span>Toronto, Canada</span>",
          "      <a href=\"mailto:booking@example.org\">booking@example.org</a>",
          "      <a href=\"https://example.org/priya\">example.org/priya</a>",
          "    </address>",
          "  </header>",
          "</ef-print-document>"
        )
      },
      {
        title: "Staff biography with long values",
        note: "Long names and addresses wrap inside their regions instead of overlapping.",
        html: h(
          "<ef-print-document class=\"ef-dense\">",
          "  <header class=\"ef-identity\">",
          "    <h1>Maximilian Oberhauser-Castellanos</h1>",
          "    <ul>",
          "      <li>Director, Office of Regional Infrastructure Resilience Programs</li>",
          "      <li><a href=\"mailto:m.oberhauser-castellanos@agency.example.gov\">m.oberhauser-castellanos@agency.example.gov</a></li>",
          "    </ul>",
          "  </header>",
          "</ef-print-document>"
        )
      }
    ]
  },

  "ef-row": {
    slug: "row",
    title: "Aligned Metadata Row",
    selector: ".ef-row",
    category: "Professional profile recipe",
    capability: "P0 portable",
    maturity: "fixture-backed",
    summary: "Primary regions grow and wrap on the start side while one [data-row-end] region (dates, years, amounts) stays on a single line at the end of the first row. No fixed coordinates.",
    caution: "Exactly one child carries data-row-end and follows the primary content in source order. Screens at 30rem or narrower move it below the primary text; print keeps it end-aligned.",
    examples: [
      {
        title: "Dated employment header",
        note: "Organization and roles on the left, an open-ended date range on the right.",
        html: h(
          "<ef-print-document class=\"ef-dense\">",
          "  <header class=\"ef-row\">",
          "    <h2>Northwind Logistics</h2>",
          "    <p><em>Director of Engineering, Senior Architect</em></p>",
          "    <p data-row-end><time datetime=\"2021-03\">March 2021</time> - Present</p>",
          "  </header>",
          "</ef-print-document>"
        )
      },
      {
        title: "Publication list",
        note: "Long citations wrap while the year stays aligned; works for bibliographies and project histories.",
        html: h(
          "<ef-print-document class=\"ef-dense\">",
          "  <ol>",
          "    <li class=\"ef-row\">",
          "      <p>Chen L, Okafor B. <cite>Evaluating traceable requirements in cross-border clinical messaging across three regional pilots</cite>. Journal of Health Informatics Practice.</p>",
          "      <p data-row-end><time datetime=\"2025\">2025</time></p>",
          "    </li>",
          "    <li class=\"ef-row\">",
          "      <p>Okafor B. <cite>Consent as data</cite>. Open Standards Quarterly.</p>",
          "      <p data-row-end><time datetime=\"2022\">2022</time></p>",
          "    </li>",
          "  </ol>",
          "</ef-print-document>"
        )
      },
      {
        title: "Reserved metadata column",
        note: "--ef-print-row-end-min reserves a wide end column, as the developer resume variant does.",
        html: h(
          "<ef-print-document class=\"ef-dense\" style=\"--ef-print-row-end-min: 45%\">",
          "  <div class=\"ef-row\">",
          "    <h2>Principal Engineer, Platform Reliability</h2>",
          "    <p><strong>Contoso Health</strong></p>",
          "    <p data-row-end><time datetime=\"2019-06\">June 2019</time> - <time datetime=\"2023-01\">January 2023</time></p>",
          "  </div>",
          "</ef-print-document>"
        )
      }
    ]
  },

  "ef-entry": {
    slug: "entry",
    title: "Entry",
    selector: ".ef-entry",
    category: "Professional profile recipe",
    capability: "P0 portable",
    maturity: "fixture-backed",
    summary: "A repeated logical entry whose first child (usually an .ef-row header) keeps with the content that follows it. data-keep requests keeping a short entry whole.",
    caution: "Keep-with-next applies only when the header has following content, so header-only entries never chain avoid-breaks. Keeps are renderer requests; an entry taller than a page still fragments.",
    examples: [
      {
        title: "Employment entry",
        note: "Header plus accomplishment list; the header will not be stranded at a page bottom where the renderer can honor it.",
        html: h(
          "<ef-print-document class=\"ef-dense\">",
          "  <article class=\"ef-entry\">",
          "    <header class=\"ef-row\">",
          "      <h2>Fabrikam Analytics</h2>",
          "      <p><em>Head of Data Platform</em></p>",
          "      <p data-row-end><time datetime=\"2018\">2018</time> - <time datetime=\"2022\">2022</time></p>",
          "    </header>",
          "    <ul class=\"ef-lead-list\">",
          "      <li><strong>Cut warehouse cost 38%</strong> by consolidating three ingestion paths.</li>",
          "    </ul>",
          "  </article>",
          "</ef-print-document>"
        )
      },
      {
        title: "Case study kept whole",
        note: "data-keep asks the renderer to keep a short case study on one page.",
        html: h(
          "<ef-print-document class=\"ef-dense\">",
          "  <article class=\"ef-entry\" data-keep>",
          "    <header class=\"ef-row\">",
          "      <h2>Regional flood-warning modernization</h2>",
          "      <p data-row-end>Client: State water authority</p>",
          "    </header>",
          "    <p>Replaced a batch alerting system with streaming river-gauge ingestion and SMS fan-out.</p>",
          "    <p>Outcome: warning lead time improved from 40 to 95 minutes.</p>",
          "  </article>",
          "</ef-print-document>"
        )
      },
      {
        title: "Header-only summary entries",
        note: "Consecutive header-only entries (such as prior roles) fragment freely between each other.",
        html: h(
          "<ef-print-document class=\"ef-dense\">",
          "  <article class=\"ef-entry\"><header class=\"ef-row\"><h2>Earlier engineering roles</h2><p data-row-end>2004 - 2012</p></header></article>",
          "  <article class=\"ef-entry\"><header class=\"ef-row\"><h2>Military service</h2><p data-row-end>2000 - 2004</p></header></article>",
          "</ef-print-document>"
        )
      }
    ]
  },

  "ef-lead-list": {
    slug: "lead-list",
    title: "Lead List",
    selector: ".ef-lead-list",
    category: "Professional profile recipe",
    capability: "P0 portable",
    maturity: "fixture-backed",
    summary: "A compact native list whose items may open with an emphasized lead phrase followed by regular-weight detail. Items request not to split across pages.",
    caution: "Keep list semantics: use ul/ol with li. Put a visible list label before the list in source; do not reorder visually. data-marker=\"none\" removes markers and indentation.",
    examples: [
      {
        title: "Accomplishments",
        note: "Square markers and a bold lead phrase, as in the executive resume.",
        html: h(
          "<ef-print-document class=\"ef-dense\" style=\"--ef-print-lead-list-marker: square\">",
          "  <ul class=\"ef-lead-list\">",
          "    <li><strong>Reduced release cycle from six weeks to two days</strong> by rebuilding the delivery pipeline.</li>",
          "    <li><strong>Cut operating cost by $500,000 a year</strong> through vendor consolidation.</li>",
          "  </ul>",
          "</ef-print-document>"
        )
      },
      {
        title: "Speaking topics without markers",
        note: "Topic prefixes carry their own punctuation as text.",
        html: h(
          "<ef-print-document class=\"ef-dense\">",
          "  <ul class=\"ef-lead-list\" data-marker=\"none\">",
          "    <li><strong>Security:</strong> threat modeling for small teams, secure defaults.</li>",
          "    <li><strong>Delivery:</strong> trunk-based development, release trains.</li>",
          "  </ul>",
          "</ef-print-document>"
        )
      },
      {
        title: "Capability statement",
        note: "Ordered list with a heavier lead weight token.",
        html: h(
          "<ef-print-document class=\"ef-dense\" style=\"--ef-print-lead-weight: 800\">",
          "  <h2>Core capabilities</h2>",
          "  <ol class=\"ef-lead-list\">",
          "    <li><strong>Grant compliance audits</strong> for federal and state programs.</li>",
          "    <li><strong>Data migration</strong> from legacy case-management systems.</li>",
          "  </ol>",
          "</ef-print-document>"
        )
      }
    ]
  },

  "ef-inline-list": {
    slug: "inline-list",
    title: "Inline Collection",
    selector: ".ef-inline-list",
    category: "Professional profile recipe",
    capability: "P0 portable",
    maturity: "fixture-backed",
    summary: "A native list rendered inline with a configurable separator after each item but the last. Wraps naturally with the surrounding text.",
    caution: "Never place the list inside <p> (the HTML parser closes the paragraph); use div, dd, or li. The separator is presentational and appears in text extraction; author meaningful punctuation as text.",
    examples: [
      {
        title: "Field of study",
        note: "Default comma separator after a degree.",
        html: h(
          "<ef-print-document class=\"ef-dense\">",
          "  <div><strong>B.A.</strong> <ul class=\"ef-inline-list\"><li>Psychology (Cognition and Learning)</li><li>Coursework in Economics</li></ul></div>",
          "</ef-print-document>"
        )
      },
      {
        title: "Middot keywords",
        note: "A non-breaking middot separator keeps the dot with the previous item.",
        html: h(
          "<ef-print-document class=\"ef-dense\" style='--ef-print-inline-list-separator: \"\\a0·\"'>",
          "  <div><ul class=\"ef-inline-list\"><li>Architecture</li><li>AI enablement</li><li>Modernization</li><li>Governance</li></ul></div>",
          "</ef-print-document>"
        )
      },
      {
        title: "Multiple roles",
        note: "Roles held at one organization, separated by semicolons.",
        html: h(
          "<ef-print-document class=\"ef-dense\" style='--ef-print-inline-list-separator: \";\"'>",
          "  <h2>Tailspin Toys</h2>",
          "  <div><ul class=\"ef-inline-list\"><li>Engineering Manager</li><li>Interim Head of QA</li><li>Accessibility Champion</li></ul></div>",
          "</ef-print-document>"
        )
      }
    ]
  },

  "ef-labeled": {
    slug: "labeled",
    title: "Labeled Collection",
    selector: ".ef-labeled",
    category: "Professional profile recipe",
    capability: "P0 portable",
    maturity: "fixture-backed",
    summary: "A label and its value laid out inline with a hanging continuation, typically a description list holding an inline collection.",
    caution: "The first child is the label. Use dl/dt/dd when the pair is a term and its description.",
    examples: [
      {
        title: "Focus areas",
        note: "The resume's Focus Areas line.",
        html: h(
          "<ef-print-document class=\"ef-dense\" style='--ef-print-inline-list-separator: \"\\a0·\"'>",
          "  <dl class=\"ef-labeled\">",
          "    <dt>Focus Areas:</dt>",
          "    <dd><ul class=\"ef-inline-list\"><li>Architecture</li><li>AI</li><li>Modernization</li><li>Governance</li></ul></dd>",
          "  </dl>",
          "</ef-print-document>"
        )
      },
      {
        title: "Credential metadata",
        note: "Several label/value pairs for a credentials sheet.",
        html: h(
          "<ef-print-document class=\"ef-dense\">",
          "  <dl class=\"ef-labeled\"><dt>Licence:</dt><dd>Professional Engineer, Ontario, #100482</dd></dl>",
          "  <dl class=\"ef-labeled\"><dt>Clearance:</dt><dd>Reliability status, renewed 2025</dd></dl>",
          "</ef-print-document>"
        )
      },
      {
        title: "Long wrapping value",
        note: "Continuation lines hang under the value, not the label.",
        html: h(
          "<ef-print-document class=\"ef-dense\">",
          "  <dl class=\"ef-labeled\">",
          "    <dt>Technologies:</dt>",
          "    <dd><ul class=\"ef-inline-list\"><li>TypeScript</li><li>F#</li><li>PostgreSQL</li><li>Kubernetes</li><li>Azure DevOps</li><li>Playwright</li><li>OpenTelemetry</li><li>Terraform</li></ul></dd>",
          "  </dl>",
          "</ef-print-document>"
        )
      }
    ]
  },

  "ef-category-grid": {
    slug: "category-grid",
    title: "Category Grid",
    selector: ".ef-category-grid",
    category: "Professional profile recipe",
    capability: "P0 portable",
    maturity: "fixture-backed",
    summary: "Groups of a heading plus a compact list in auto-filled columns. Any number of groups and items; each group asks to stay whole across pages.",
    caution: "Keeping a group whole is a renderer request; a group taller than a page still fragments. Screens at 30rem or narrower use one column; print keeps the authored tracks.",
    examples: [
      {
        title: "Technology categories",
        note: "Fixed 200px tracks reproduce the resume's technology grid.",
        html: h(
          "<ef-print-document class=\"ef-dense\" style=\"--ef-print-category-min: 200px; --ef-print-category-max: 200px\">",
          "  <ul class=\"ef-category-grid\">",
          "    <li><h3>Languages</h3><ul><li>C#</li><li>F#</li><li>TypeScript</li></ul></li>",
          "    <li><h3>Cloud Platforms and DevOps</h3><ul><li>Azure</li><li>AWS</li><li>Kubernetes</li></ul></li>",
          "    <li><h3>Databases</h3><ul><li>PostgreSQL</li><li>Redis</li></ul></li>",
          "  </ul>",
          "</ef-print-document>"
        )
      },
      {
        title: "Talks by topic",
        note: "Wider tracks for longer entries, as in the developer resume's speaking grid.",
        html: h(
          "<ef-print-document class=\"ef-dense\" style=\"--ef-print-category-min: 16em\">",
          "  <ul class=\"ef-category-grid\">",
          "    <li><h3>JavaScript</h3><ul><li>Currying in JavaScript</li><li>Functional Pipelining</li></ul></li>",
          "    <li><h3>Security</h3><ul><li>Attacking the System: SQL Injection Attacks</li><li>Social Engineering</li></ul></li>",
          "  </ul>",
          "</ef-print-document>"
        )
      },
      {
        title: "Long category labels",
        note: "Long headings and items wrap inside their track without clipping.",
        html: h(
          "<ef-print-document class=\"ef-dense\">",
          "  <ul class=\"ef-category-grid\">",
          "    <li><h3>Interoperability governance and assurance frameworks</h3><ul><li>Data-protection impact assessment</li></ul></li>",
          "    <li><h3>Standards</h3><ul><li>HL7 FHIR profiling</li><li>SNOMED CT binding</li></ul></li>",
          "  </ul>",
          "</ef-print-document>"
        )
      }
    ]
  },

  "ef-dense": {
    slug: "dense",
    title: "Dense Rhythm",
    selector: ".ef-dense",
    category: "Professional profile recipe",
    capability: "P0 portable",
    maturity: "fixture-backed",
    summary: "Compact block spacing and heading keep-with-next intent for dense professional documents, applied once on the document root.",
    caution: "Density comes from spacing tokens, not smaller text. Do not shrink type to force content onto a page.",
    examples: [
      {
        title: "Resume rhythm",
        note: "Tight section spacing with headings that stay with their content.",
        html: h(
          "<ef-print-document class=\"ef-dense\">",
          "  <h2>Specializations</h2>",
          "  <p>Accessibility and adaptive technologies, human-centered design.</p>",
          "  <h2>Volunteering</h2>",
          "  <p>Teaching programming and computer science, 2016 - 2020.</p>",
          "</ef-print-document>"
        )
      },
      {
        title: "Looser CV rhythm",
        note: "The same recipe with larger spacing tokens for an academic CV.",
        html: h(
          "<ef-print-document class=\"ef-dense\" style=\"--ef-print-dense-heading-space: 1.4em; --ef-print-dense-block-space: .7em\">",
          "  <h2>Research interests</h2>",
          "  <p>Clinical terminologies, evidence appraisal, consent provenance.</p>",
          "  <h2>Teaching</h2>",
          "  <p>Graduate seminar in health data standards.</p>",
          "</ef-print-document>"
        )
      },
      {
        title: "Project history",
        note: "Dense rhythm combined with entries and rows.",
        html: h(
          "<ef-print-document class=\"ef-dense\">",
          "  <h2>Selected projects</h2>",
          "  <article class=\"ef-entry\">",
          "    <header class=\"ef-row\"><h3>Permit portal rebuild</h3><p data-row-end>2024</p></header>",
          "    <p>Moved 14 permit types online; median approval time fell from 21 to 6 days.</p>",
          "  </article>",
          "</ef-print-document>"
        )
      }
    ]
  }
};

export const profileFamily = [
  {
    id: "RESUME-01",
    slug: "resume-01",
    title: "Executive resume",
    fixture: "tests/fixtures/profiles/resume-01.html",
    stylesheet: "tests/fixtures/profiles/resume.css",
    summary: "Reproduction of kemiller2002/resume index.html (ba786e4): centered name with stacked contacts, highlights, leadership entries with lead-phrase accomplishments, ventures, volunteering, technology grid, education, awards, and speaking topics.",
    page: "A4 portrait, 10 mm margins, Chromium page frame",
    pages: "4 (reference 4)",
    primitives: ["ef-print-document", "ef-print-keep"],
    recipes: [".ef-dense", ".ef-identity", ".ef-row", ".ef-entry", ".ef-lead-list", ".ef-inline-list", ".ef-category-grid"],
    capability: "P0 layout · P2 deterministic Chromium PDF evidence",
    limitations: "The page frame is Chromium @page border decoration and is omitted by other renderers. Keeps are renderer requests. Reference defects RD-01 and RD-02 (empty headings) are omitted.",
    mobile: "Identity stacks at 48rem; dates move below their entry text and the technology grid becomes one column at 30rem. Print keeps the A4 layout."
  },
  {
    id: "RESUME-02",
    slug: "resume-02",
    title: "Developer resume",
    fixture: "tests/fixtures/profiles/resume-02.html",
    stylesheet: "tests/fixtures/profiles/resume.css",
    summary: "Reproduction of developer.html: role title leads each entry with the organization beneath, a reserved half-width date column, titled accomplishment lists, dated award rows, and a talks-by-topic grid.",
    page: "A4 portrait, 10 mm margins, Chromium page frame",
    pages: "3 (reference 3)",
    primitives: ["ef-print-document"],
    recipes: [".ef-dense", ".ef-identity", ".ef-row", ".ef-entry", ".ef-lead-list", ".ef-inline-list", ".ef-category-grid"],
    capability: "P0 layout · P2 deterministic Chromium PDF evidence",
    limitations: "Same as RESUME-01. Reference defects RD-03 to RD-05 ([object Object] link, missing Present, unseparated study list) are corrected, not reproduced.",
    mobile: "Same recipe behavior as RESUME-01; no variant-specific screen rules."
  },
  {
    id: "PROFILE-03",
    slug: "profile-03",
    title: "Generalized professional profile",
    fixture: "tests/fixtures/profiles/profile-03.html",
    stylesheet: "tests/fixtures/profiles/profile-03.css",
    summary: "A fictional researcher and program advisor: serif type, left-aligned identity with inline contacts, appointments with labeled focus areas, a publication list with year rows, credentials, speaking, and capabilities.",
    page: "US Letter portrait, 0.6 in × 0.65 in margins",
    pages: "2",
    primitives: ["ef-print-document", "ef-print-keep"],
    recipes: [".ef-dense", ".ef-identity", ".ef-row", ".ef-entry", ".ef-lead-list", ".ef-inline-list", ".ef-labeled", ".ef-category-grid"],
    capability: "P0 layout · P2 deterministic Chromium PDF evidence",
    limitations: "Illustrative content about a fictional person. Keeps are renderer requests.",
    mobile: "Inline contacts wrap; dates move below text and capabilities become one column at 30rem. Print keeps the Letter layout."
  }
];
