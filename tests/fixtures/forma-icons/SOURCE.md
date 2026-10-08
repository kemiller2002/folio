# Forma icon fixture provenance

`forma-0.5.0-prerelease/` is a **test fixture, not a release and not a pin**.
It contains 8 of the 40 entries of `dist/icons/registry.json` and the matching
`dist/icons/<name>.svg` files, copied byte for byte from a locally packed,
**unpublished** Forma 0.5.0 tarball built from kemiller2002/forma PR #114:

| Artifact | sha256 |
|---|---|
| `echelon-foundry-design-system-0.5.0.tgz` (local `npm pack`, pre-release) | `c4ad3ae525a85f55a9e9aec4f0e19c59b7f552cececb4224a0bbc3434f4f558f` |

Folio's actual Forma version is the Conditor pin in
`.conditor/authority/resolved-release-set.json` (0.4.1 when this fixture was
added, which publishes no icons). `tests/run-forma-icon-print-tests.mjs`
enforces the relationship:

- pin older than the fixture: `PROVENANCE.json` must say `pre-release-unpublished`;
- pin equal to the fixture: `PROVENANCE.json` must say `published` and its
  `artifactSha256` must equal the pinned package artifact sha256, so the
  committed bytes are provably the released bytes;
- pin newer than the fixture: the fixture is stale and the suite fails.

Refresh after Forma publishes: extract the released tarball, set
`FOLIO_FORMA_PACKAGE_DIR=<extracted>/package`, and run
`npm run test:forma-icon-print`. That leg verifies every fixture byte and
registry entry against the package, then prints all icons in the package. Copy
the 8 files again if they differ, update `PROVENANCE.json`, and only then move
the pin (`conditor upgrade`). `.gitattributes` keeps these files byte-exact
(`-text`), because their sha256 digests are part of the contract.

`visual-baseline.json` holds coarse 16x16 ink masks of each glyph as printed
by Chromium and rasterized by Poppler. Regenerate it only after reviewing a
geometry change: `FOLIO_UPDATE_ICON_BASELINE=1 npm run test:forma-icon-print`.
