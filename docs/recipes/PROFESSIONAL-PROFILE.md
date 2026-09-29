# Professional Profile / Resume Document Family

Status: implemented recipe layer and canonical fixtures
Work item: `kemiller2002/folio#17`
Decision: `DF-PRINT-2026-0004`; evidence: `EV-PRINT-2026-0006`
Requirements: `docs/requirements/PRINT-COMPONENTS-REQUIREMENTS.md` §27 (`FOLIO-RES-*`)
Fixtures: `tests/fixtures/profiles/` (`RESUME-01`, `RESUME-02`, `PROFILE-03`)
Folio baseline: 0.3.0 + `ef-print-recipes` layer

## Purpose

Folio can reproduce a real, dense, two-variant resume and materially different
professional profiles (CVs, speaker sheets, staff biographies, credentials
sheets, capability statements, project histories, publication lists) from
semantic HTML plus a small set of stylesheet recipes. It adds no resume
element.

```text
application data (resume.json, CMS, HR system …)
  -> application template (selection, ordering, date formatting, variants)
  -> semantic HTML
  -> Folio elements (ef-print-document, ef-print-keep) + recipes (.ef-*)
  -> print.css + consumer theme CSS
  -> browser / deterministic Chromium renderer
```

## Reference analysis

Reference: `kemiller2002/resume` `master` at `ba786e4` (`index.html`,
`developer.html`, `resume.css`, `resume.json`). Both pages bind `resume.json`
with Knockout 3.5.1 and print at A4 with 10 mm margins. Rendered in Chromium,
`index.html` produces 4 pages and `developer.html` 3 pages.

| Pattern | Reference implementation | Concern |
| --- | --- | --- |
| Name/contact header | `.header` flex: centered `h1` (2em) grows; contact column stacks phone/email/site | B structure, C layout, D style |
| About, career highlights | paragraphs; unbulleted list with 0.2em rhythm | B, D |
| Section separator | `<hr>` after highlights | B |
| Leadership entries | `li.employment-entry` on an 8-track percentage grid; organization + italic titles left, dates right | B, C |
| Multiple titles | comma-joined nowrap spans | B, D |
| Date ranges, Present | `.start ~ .end::before { content: "-" }`, `Present` when `end` is null (index only) | A formatting, C alignment |
| Accomplishments | square bullets; 600-weight lead phrase + detail span | B, C, D |
| Focus areas | `Focus Areas:` label + middot-separated inline list (all hidden by current data) | A selection, C |
| Previous roles | header-only dated entry | B, C |
| Ventures | same dated-entry structure | B |
| Projects, volunteering | institution heading + name/description row + right-aligned years | B, C |
| Specializations | plain list | B |
| Technologies | `repeat(auto-fit, 200px)` grid of category groups; sorted active items | A selection/sorting, C layout |
| Education | institution; degree + inline study list + years; awards list | B, C |
| Awards | `Institution - description, name, year` inline row | B, D |
| Speaking topics | lead phrase + `:` + detail; `page-break-inside: avoid` on the section | B, E |
| Page | `@page { size: A4; margin: 10mm; border: 1px solid black; padding-top: .4em }` | D (frame is Chromium page-box decoration), E |
| Screen | body flex-centered, 800 px column | D |

Concern key: A application/data, B semantic structure, C reusable layout, D
visual styling, E pagination/renderer.

Application concerns that stay out of Folio: Knockout binding, `resume.json`
schema, sorting employment by start date, filtering `hide`/`entryOnly`/`active`
flags, month-name formatting, `Present` substitution, executive versus
developer content choice, and the phone-number separator.

### Reference defects (not reproduced as behavior)

| ID | Variant | Defect |
| --- | --- | --- |
| RD-01 | both | Empty `Projects` heading for an empty array |
| RD-02 | both | `Test Automation` technology heading with no active items |
| RD-03 | developer | `[object Object]` contact link (object bound as text/href) |
| RD-04 | developer | Open range printed as `February 2024 -` without `Present` |
| RD-05 | developer | Study array stringified as `Learning),Coursework` |

The fixtures omit or correct these; the parity test declares each word-level
difference in `tests/fixtures/profiles/reference/manifest.json`. The reference
also renders data items marked `display: false` (for example two career
highlights); that is current published content, so the fixtures keep it.

Screen-reading order note: `developer.html` places the `Accomplishments`
heading after its list and restores visual order with `column-reverse`. The
fixture puts the heading first in source (`FOLIO-RES-034`).

## Gap analysis

| Pattern | Classification | Folio answer |
| --- | --- | --- |
| Document boundary | existing Folio primitive | `ef-print-document` |
| Small keep-together block (speaking topics) | existing Folio primitive | `ef-print-keep` |
| Headings, paragraphs, lists, `hr`, `address`, `time`, `cite` | native semantic HTML | no Folio addition |
| Identity/contact composition | recipe | `.ef-identity` |
| Dated entry header, project/education/volunteering/publication rows | recipe | `.ef-row` + `[data-row-end]` |
| Entry heading orphan control | recipe | `.ef-entry` |
| Accomplishment list with lead phrase | recipe | `.ef-lead-list` |
| Inline collection (study, focus areas, roles) | recipe | `.ef-inline-list` |
| Label + collection (`Focus Areas:`) | recipe | `.ef-labeled` |
| Categorized dense grid (technologies, talk topics, capabilities) | recipe | `.ef-category-grid` |
| Dense rhythm + heading keep-with-next | recipe | `.ef-dense` |
| Awards inline sentence | native HTML | `strong` + text |
| Page size/margins, frame, type scale | consumer CSS | `@page`, tokens |
| Content selection, sorting, variants, formatting | application | resume repository |
| New public custom element | not justified | none added (`DF-PRINT-2026-0004`) |

## Recipe contracts

All recipes live in the `ef-print-recipes` cascade layer of
`@echelon-foundry/print-components/print.css`. Unlayered consumer CSS overrides
them. They are P0 portable CSS; keep behavior is renderer intent.

### `.ef-identity`

Structure: first child is the identity region (a heading, or a wrapper with a
heading and tagline); following child is the contact region (`address` or
list). Contact values stack; `data-contact="inline"` wraps them in a row under
the identity. Tokens: `--ef-print-identity-align`, `--ef-print-identity-gap`,
`--ef-print-identity-contact-gap`. Screen ≤ 48rem: single column.

### `.ef-row` / `[data-row-end]`

Any element whose children are primary regions plus one `[data-row-end]`
region (dates, years, amounts). Primary regions stack in a growing first
track and wrap; the end region stays on one line, end-aligned with the first
primary line. Source order stays primary-then-metadata. Tokens:
`--ef-print-row-gap`, `--ef-print-row-end-min` (for example `50%` to reserve a
wide metadata column). Screen ≤ 30rem: the end region moves below the primary
text. Prefer `<time datetime>` inside the end region.

### `.ef-entry`

Repeated logical entry (`article`, `li`). The first child (usually an
`.ef-row` header) requests `break-after: avoid` when content follows it.
`data-keep` requests `break-inside: avoid` for short entries. Token:
`--ef-print-entry-gap`.

### `.ef-lead-list`

Native `ul`/`ol` whose items may start with `<strong>` or `<b>` lead text
followed by detail text. Items request `break-inside: avoid`.
`data-marker="none"` removes markers and indentation. Tokens:
`--ef-print-lead-list-indent`, `--ef-print-lead-list-marker`,
`--ef-print-lead-list-item-gap`, `--ef-print-lead-weight`.

### `.ef-inline-list` and `.ef-labeled`

`.ef-inline-list` renders a native list inline with a separator after every
item but the last (`--ef-print-inline-list-separator`, default `","`). Put the
list inside a `div`, `dd`, or `li`, never inside `p`. The separator is
presentational and readable by assistive technology; author meaningful
punctuation as text.

`.ef-labeled` lays out a label (first child) and content (remaining children)
inline with a hanging continuation, typically `<dl class="ef-labeled"><dt>…`.

### `.ef-category-grid`

A list of groups; each group is a heading followed by a list. Tracks are
`repeat(auto-fill, minmax(min(--ef-print-category-min, 100%), --ef-print-category-max))`.
Groups request `break-inside: avoid`; group headings keep with their list.
Screen ≤ 30rem: one column.

### `.ef-dense`

Applied to the document root. Headings request keep-with-next; blocks use
`--ef-print-dense-heading-space` and `--ef-print-dense-block-space`.

## Canonical fixtures

| Fixture | Source | Page | Consumer CSS | Pages (Chromium 141) |
| --- | --- | --- | --- | --- |
| `RESUME-01` | reference `index.html` rendered output | A4, 10 mm, page frame | `resume.css` | 4 (reference 4) |
| `RESUME-02` | reference `developer.html` rendered output | A4, 10 mm, page frame | `resume.css` | 3 (reference 3) |
| `PROFILE-03` | fictional researcher/advisor profile | Letter, 0.6 in | `profile-03.css` | 2 |

RESUME-01 and RESUME-02 share one consumer stylesheet and the same recipes;
the developer composition differs only in content selection, heading order
inside entry headers, a reserved 50 % metadata column, and a titled
accomplishment subsection. PROFILE-03 uses a serif type system, left-aligned
identity, inline contacts, a publication list with year rows, labeled focus
areas, and a long organization name to stress date collision.

## Renderer limitations

- Deterministic PDF evidence: Chromium (P2). Firefox/WebKit: screen and
  print-media layout checks (P0), not paginated PDF.
- `@page { border }` page frames are Chromium page-box decoration; other
  renderers omit the frame without losing content.
- `break-inside: avoid` and `break-after: avoid` are requests. A group taller
  than the page still fragments.
- Separator glyphs from `::after` appear in PDF text extraction.

## Verification

```bash
npm run test:profiles   # or npm test
npm run site:check
npm run site:test:browser
```

`test:profiles` checks, per fixture: A4/Letter page size, words inside the
authored content box, end-aligned single-line dates with no collision, lead
emphasis, list semantics, grid columns and keep requests, no page ending on a
heading, word parity with the reference snapshot (declared defects only),
Letter/A4 adaptation without word loss, identical output without JavaScript,
and phone widths 320/390/430 without overflow with print media restoring the
authored layout. Set `FOLIO_ENGINES=chromium` to limit the cross-engine part
where Firefox/WebKit are unavailable; CI runs all three.
