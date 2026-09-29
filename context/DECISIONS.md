# Echelon Print Components decisions

Material decisions use `DF-` records under `research/decisions/`. This compact
table is a navigation view, not a replacement for those records.

| Date | Decision | Status | Rationale | Record |
|---|---|---|---|---|
| 2026-09-29 | Express professional-profile layout as stylesheet recipes over semantic HTML; add no resume-domain elements. | accepted | Reference resume patterns are general layout contracts whose host element depends on meaning. | `DF-PRINT-2026-0004` |
| 2026-09-22 | Use ROS 3.1.4 as a measured greenfield pilot. | provisional | Test portability and operational value on a real beginning project. | Not yet promoted to a `DF-` record |
| 2026-09-22 | Use semantic HTML + light-DOM custom elements for printable content. | provisional pending experiment | Keeps source order, cascade, theming, and fragmentation visible to the document renderer. | Promote after PAGINATION-01 |
| 2026-09-22 | Do not build a JavaScript pagination engine as the core architecture. | provisional | Browser/paged-media engines already own fragmentation; duplicating them would add font/table/image/accessibility failure modes. | Promote after initial conformance experiments |
| 2026-09-22 | Model renderer capability explicitly as P0/P1/P2/P3. | provisional | Current browsers materially differ on margin boxes, page counters, bleed, footnotes, and related publishing features. | Promote with capability schema |
| 2026-09-22 | Use a separate deterministic Chromium adapter for controlled PDF output. | provisional | Keeps core install light while providing repeatable headers/background/options/assets. | Promote after export prototype |
| 2026-09-22 | Keep enhanced publishing engines optional until canonical-fixture experiments justify adoption. | provisional | Avoids prematurely coupling all consumers to a specialized renderer. | Promote after ENHANCED-01 |
