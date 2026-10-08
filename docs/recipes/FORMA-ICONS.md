# Using Forma icons in Folio (staged adapter)

**Status:** The static print adapter is implemented; the first real version-pinned Forma icon PDF fixture and independent print-browser proof remain outstanding.

## Contract

Folio never owns, copies or redraws canonical Forma icon geometry. The build-time Node adapter exported from `@echelon-foundry/print-components/forma-icons` reads `dist/icons/registry.json` and individual SVG files from an explicit local copy of an immutable Forma package. It validates names, version, asset locations and a restricted SVG grammar. No fetch, script, external sprite, font, inline executable attributes or runtime custom element is required.

```js
import { renderFormaPrintIcon } from "@echelon-foundry/print-components/forma-icons";

const workflowGlyph = renderFormaPrintIcon("workflow", {
  assetsRoot: "/path/to/pinned-forma/dist/icons",
  label: "Workflow", // omit for decorative use
  size: "14pt"
});
const html = `<ef-print-document><ef-print-section>
  <h1>Design review</h1>
  <p>${workflowGlyph} Workflow: three stages, two decisions.</p>
</ef-print-section></ef-print-document>`;
```

Only use `label` when the glyph itself conveys independent meaningful information; otherwise the printed words carry meaning and the wrapper is `aria-hidden`. `size` is validated to a safe CSS length. Folio's `print.css` owns page fitting and inline icon size; Forma's generated SVG is embedded without HTTP loading. Printed status MUST also appear in words. The class is `.ef-print-icon` and the identifier is `data-ef-icon`.

## Verify

```sh
npm run test:forma-icons
npm test
npm run pack:verify
```

After a released Forma icon package is pinned, generate a real comparison fixture with warning, success, search and workflow; validate Chromium offline render, Letter/A4 PDFs, grayscale and backgrounds-disabled print, accessibility and PDF text extraction. The adapter's current unit tests intentionally use a self-contained minimal fixture, **not** a claim of real released Forma-artifact or PDF validation. Track the end-to-end gate in https://github.com/kemiller2002/folio/issues/45.
