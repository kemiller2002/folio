# Forma icon fixture provenance

`forma-0.5.0/` is a **test fixture, not a pin**. It contains 8 of the 40
entries of `dist/icons/registry.json` and the matching `dist/icons/<name>.svg`
files of the **published** Forma 0.5.0 release, byte for byte:

| Release asset | sha256 |
|---|---|
| [`echelon-foundry-design-system-0.5.0.tgz`](https://github.com/kemiller2002/forma/releases/tag/v0.5.0) (commit `8a5a5993421fbfd808582f735dedcf2adea07010`) | `c4ad3ae525a85f55a9e9aec4f0e19c59b7f552cececb4224a0bbc3434f4f558f` |

The files were first copied from a local `npm pack` of kemiller2002/forma
PR #114 before publication. On 2026-10-08 the published release asset was
downloaded, matched the digest above (identical to the local pack), and every
fixture byte and registry entry was verified against it, so `PROVENANCE.json`
now says `published`. No fixture file changed.

Folio's actual Forma version is the Conditor pin in
`.conditor/authority/resolved-release-set.json`. It is still 0.4.1, which
publishes no icons, because the echelon-registry `echelon-current` resolved set
(1.7.0 at the time of writing) does not yet record or select Forma 0.5.0, and
Conditor moves the pin only from a Registry selection.
`tests/run-forma-icon-print-tests.mjs` enforces the relationship:

- pin older than the fixture: `PROVENANCE.json` says `pre-release-unpublished`
  or `published`;
- pin equal to the fixture: `PROVENANCE.json` must say `published` and its
  `artifactSha256` must equal the pinned package artifact sha256, so the
  committed bytes are provably the released bytes;
- pin newer than the fixture: the fixture is stale and the suite fails.

Re-verify at any time: extract the release tarball, set
`FOLIO_FORMA_PACKAGE_DIR=<extracted>/package`, and run
`npm run test:forma-icon-print`. That leg checks every fixture byte and
registry entry against the package, then prints all icons in it.
`.gitattributes` keeps these files byte-exact (`-text`), because their sha256
digests are part of the contract.

`visual-baseline.json` holds coarse 16x16 ink masks of each glyph as printed
by Chromium and rasterized by Poppler. Regenerate it only after reviewing a
geometry change: `FOLIO_UPDATE_ICON_BASELINE=1 npm run test:forma-icon-print`.
