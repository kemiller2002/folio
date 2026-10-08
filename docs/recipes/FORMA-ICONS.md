# Forma icons in Folio

Folio 0.4.0 adds a build-time only adapter for **released, version-pinned** Forma SVG assets. This is additive and has no effect on existing print components. The adapter **never copies icon geometry**, fetches a CDN or installs a browser icon runtime.

```js
import {renderFormaPrintIcon} from "@echelon-foundry/print-components/forma-icons";

const html = renderFormaPrintIcon("email", {
  assetsRoot: "./node_modules/@echelon-foundry/design-system/dist/icons",
  expectedFormaVersion: "0.6.0",
  label: "Email",
  size: "14pt"
});
```

The local registry must have schemaVersion 1, grid 24 and exact `formaVersion`; every icon must have the expected stable filename and a SHA-256 SVG digest. The adapter verifies the SVG byte digest and accepts only constrained SVG shapes before embedding it in printable HTML. Labels are escaped, and decorative icons default to `aria-hidden`. Meaningful status and consequences require adjacent visible text; glyphs do not change state.

The Forma 0.6.0 example above is a target **only after** Forma release assets have been published and verified. Do not use a floating dependency or a source-branch snapshot for production.

## Verification

```sh
npm run test:forma-icons
npm test
npm run pack:verify
```

The included adversarial tests use a synthetic valid registry and intentionally tampered geometry to verify the integrity boundary. They do **not** prove a published Forma 0.6.0 tarball or a real PDF was tested.

Before merging and publishing Folio 0.4.0, pin the published Forma release and add cross-package fixtures: report, menu, business card; A4 and Letter PDF rendering offline; grayscale and print with backgrounds disabled; icon sizes 16, 20, 24, 32; accessible status text and artifact comparisons. Those are independent release gates, tracked in [Folio #45](https://github.com/kemiller2002/folio/issues/45).

Do not hand-copy SVG paths, rebrand semantic status by color alone, or add remote sprite dependencies.
