# Folio Documentation Site Requirements

Status: implementation baseline
Tracked work: GH-4
Date: 2026-09-22

## 1. Purpose

Folio needs a public documentation/showcase site that explains the implemented print component surface, demonstrates real markup, teaches capability boundaries, and gives agents an explicit reuse contract.

The site is a discovery and teaching surface. The Folio source files, requirements, architecture decisions, experiments, and evidence remain authoritative.

## 2. Brand and visual language

- The site MUST use the Echelon Foundry production visual language.
- It MUST use the established parchment, charcoal, forged-iron, oxide-bronze, verdigris, graphite, and stone palette roles.
- It MUST use Newsreader for display typography, Manrope for interface/body typography, and IBM Plex Mono for technical metadata when network fonts are available.
- It MUST preserve keyboard focus, narrow-screen reflow, reduced-motion behavior, and forced-colors usability.
- The docs shell MUST remain visually distinct from the printable document previews.

## 3. Component coverage

- Every element registered by `src/components/register.js` MUST have one dedicated component page.
- A registered element without documentation metadata MUST fail the site build.
- Stale metadata for a no-longer-registered element MUST fail the site build.
- Each component page MUST include at least three examples.
- Each example MUST expose the example HTML.
- Examples MUST be standalone print-ready HTML files so consumers can open and print them directly.
- Site content MUST NOT invent pages for components that are only planned in requirements/architecture.

## 4. Capability honesty

Each component page MUST display:

- the custom-element name;
- the applicable capability tier/posture;
- maturity/evidence status;
- the fact that pagination belongs to the browser/selected renderer;
- any known caveat relevant to the component.

The site MUST explain P0/P1/P2/P3 and MUST NOT imply renderer-specific features are portable.

The sidebar page MUST explicitly preserve its provisional status until stronger evidence exists.

## 5. Preview isolation

- The Echelon Foundry documentation shell MUST NOT be styled by Folio's global print stylesheet.
- Live component examples MUST render in isolated standalone documents/frames using the actual `src/styles/print.css`.
- Documentation-only screen visualization may show paper surfaces and invisible fragmentation markers, but MUST disappear or degrade safely in print output.
- The preview layer MUST NOT change the underlying Folio component contract.

## 6. Zero-runtime documentation

- Generated documentation HTML MUST contain no `<script>` elements.
- Generated documentation MUST contain no inline event handlers.
- The site generator may use Node at build time.
- Folio component examples MUST remain useful without custom-element upgrade.

## 7. Agent guidance

The repository MUST include explicit Folio agent instructions covering:

- semantic-HTML-first composition;
- current public component surface;
- capability tiers;
- renderer ownership;
- prohibition on JavaScript pagination;
- light-DOM requirement;
- Limen/Ordo boundary;
- component-specific cautions;
- documentation obligations for new public elements;
- verification commands.

`AGENTS.md` and GitHub Copilot instructions MUST point agents to the Folio usage contract.

## 8. GitHub Pages

The repository MUST include:

- a PR validation workflow for Folio site changes;
- a main-branch GitHub Pages deployment workflow;
- generated `.nojekyll`;
- project-relative links compatible with repository Pages hosting.

The Pages workflow MUST build/validate the site before upload.

## 9. Validation

Static tests MUST verify:

- component count matches the registration surface;
- each component has one page;
- each component has at least three examples;
- each example has a standalone demo;
- the generated site has no browser script;
- capability and agent pages are generated;
- actual Folio print CSS is included.

Browser tests MUST exercise the site in Chromium, Firefox, and WebKit and verify:

- catalog renders;
- component examples load;
- actual Folio styles apply inside previews;
- capability caveats are visible;
- agent guidance is present;
- narrow-screen shell does not create page-level horizontal overflow.

## 10. Mobile and narrow-screen support

Mobile support is a first-class documentation requirement.

- The documentation shell MUST be usable at 320px, 390px, and 430px viewport widths.
- Home, component, capability, agent, and standalone example pages MUST NOT create page-level horizontal overflow.
- Header navigation MUST reflow to touch-friendly controls without clipping or overlap.
- Component navigation MUST remain usable by touch and keyboard on narrow screens.
- Navigation and example actions SHOULD provide approximately 44 CSS-pixel touch targets where practical.
- Code samples and wide capability/ownership tables MAY scroll internally, but their containing page MUST NOT overflow.
- Embedded print previews MUST remain understandable on phones.
- Screen-only mobile adaptations MAY simplify columns, side rails, or wide tables for inspection, but MUST NOT change Folio's print-media behavior or renderer guarantees.
- Mobile documentation CSS MUST NOT become a pagination workaround or change the underlying Folio component contract.
- Cross-browser mobile checks MUST run in Chromium, Firefox, and WebKit.
- Mobile behavior required by shipped Folio components MUST live in the public Folio stylesheet, not only in documentation-demo CSS.
- `ef-print-columns` MUST collapse to one column on narrow screens while retaining its authored column count in print media.
- `ef-print-sidebar` MUST stack on narrow screens while retaining its side-rail grid in print media.
- Structural primitives that already follow normal block flow MUST NOT receive unnecessary mobile-specific behavior.

## 11. Generated output

`site-dist/` is generated output and MUST be gitignored.

Agents MUST NOT edit generated site files manually.

## 12. Recipes and document families

- Every public recipe in the `ef-print-recipes` layer MUST have one generated page with its selector, capability, maturity, contract note, and at least three standalone examples; a recipe with fewer MUST fail the site build.
- The Resume / Professional Profile family page MUST publish RESUME-01, RESUME-02, and PROFILE-03 with rendered preview, semantic source, primitives/recipes used, page dimensions, capability tier, renderer limitations, and mobile behavior (`FOLIO-RES-097`, `FOLIO-RES-098`).
- Recipe and family pages MUST pass the same no-script, no-overflow (320/390/430 px), and cross-engine browser checks as component pages.
