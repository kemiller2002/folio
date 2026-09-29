# Echelon Print Components research queue

| Priority | Question | Decision affected | Discriminating evidence | Status |
|---:|---|---|---|---|
| 1 | Do light-DOM custom elements fragment the same way as equivalent native wrappers across target renderers? | Core component model | Matched fixtures in Chromium, Firefox, WebKit, enhanced renderer | open |
| 2 | Can Chromium margin boxes satisfy static running headers/footers, Page X of Y, title suppression, and left/right placement reliably? | P1 API | Multi-page PDF fixtures and geometry/text assertions | open |
| 3 | What is the correct Firefox/Safari fallback for running content and page numbers? | Portable behavior | Same canonical document printed without margin-box support | open |
| 4 | Which multi-column combinations remain stable across page breaks with figures, headings, and explicit breaks? | Column component | Long multicol fixtures across browsers | open |
| 5 | Which in-flow sidebar implementation survives fragmentation best: grid, floats, or another standards layout? | Sidebar component | Matched multi-page fixtures with overlap/clipping assertions | open |
| 6 | How reliably do table headers repeat and rows fragment in each renderer? | Table component | Long/oversized row fixtures, portrait and landscape | open |
| 7 | Which page-art strategy gives the best result with print backgrounds both on and off? | Artwork/layer component | Title/body/back fixtures under both settings | open |
| 8 | Which public page parameters can be CSS-variable driven and which require generated @page rules? | Theming/API/CSP | Browser tests with variable substitutions and named pages | open |
| 9 | How much does font readiness/substitution change page count and break placement? | Deterministic export | Controlled font-delay/fallback experiments | open |
| 10 | What semantic/tagging information does Chromium PDF preserve? | Accessibility claim | PDF structure inspection against semantic HTML fixture | open |
| 11 | Which capabilities does Vivliostyle materially add to the canonical use cases? | P3 adapter decision | Same fixture rendered Chromium vs Vivliostyle | open |
| 12 | Is a Prince integration valuable enough to warrant a commercial adapter? | P3 commercial option | Gap analysis after open/browser renderer experiments | open |
| 13 | What geometric PDF invariants can be tested without brittle pixel equality? | Test architecture | Prototype page-box/text/overlap assertions | open |
| 14 | What is the smallest public primitive set that covers reports/proposals/manuals without replacing HTML? | API scope | Build 3-5 representative documents and measure escape hatches | open |
| 15 | What tagged-PDF/PDF-UA path is required if downstream customers need formally accessible PDFs? | Future renderer | Renderer comparison against accessibility requirements | open |
| 16 | Do Firefox and WebKit paginate `.ef-row` headers and `.ef-category-grid` groups with the same keep behavior as Chromium when printed to PDF? | Recipe capability tier beyond P0 layout | Paginated PDF output from non-Chromium engines for RESUME-01/PROFILE-03 | open |
| 17 | Should recipes also ship as a separate stylesheet export so consumers can adopt them without the element CSS? | Package exports | Consumer migration experience (kemiller2002/resume#1) | open |
