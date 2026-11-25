# Forma icon fixture provenance

`forma-1.0.1/` is the print fixture for Folio's current Forma pin (1.0.1,
echelon-current 1.42.0). It contains 8 of the 80 entries of
`dist/icons/registry.json` and the matching `dist/icons/<name>.svg` files of the
**published** Forma 1.0.1 release, byte for byte:

| Release asset | sha256 |
|---|---|
| [`echelon-foundry-design-system-1.0.1.tgz`](https://github.com/kemiller2002/forma/releases/tag/v1.0.1) (commit `0ddbfc968aeb79062513da97d06d1ea959dcf02a`) | `db4a8bf7bcf6ba7826f1605c4265ea86c456464f2e2a3eef18d026f24c242056` |

The geometry is identical to 0.5.0; Forma 1.0 renamed the SVG root class
`ef-icon__svg` to `forma-icon__svg`, so the digests differ.
`tests/run-forma-icon-print-tests.mjs` uses `forma-1.0.1/`;
`tests/run-forma-icon-tests.mjs` keeps `forma-0.5.0/` (below) to prove the
pre-1.0 root still verifies under a pre-1.0 pin.

## forma-0.5.0

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
`.conditor/authority/resolved-release-set.json`: Forma 1.0.1 since
echelon-current 1.42.0 (0.5.0 from echelon-current 1.13.0 until then, with the
0.5.0 artifact sha256 above). `tests/run-forma-icon-print-tests.mjs` enforces
the relationship between the pin and the print fixture (`forma-1.0.1/`):

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
