import "../runtime.js";

const elementNames = [
  "ef-print-document",
  "ef-print-title-page",
  "ef-print-section",
  "ef-print-back-page",
  "ef-print-header",
  "ef-print-footer",
  "ef-print-page-number",
  "ef-print-columns",
  "ef-print-sidebar",
  "ef-print-layer",
  "ef-print-break",
  "ef-print-keep",
  "ef-print-metric",
  "ef-print-integrity",
  "ef-print-finding",
  "ef-print-callout",
  "ef-print-figure",
  "ef-print-table",
  "ef-print-code",
  "ef-print-toc",
  "ef-print-note",
  "ef-print-security-record",
  "ef-print-security-posture",
  "ef-print-security-invariant",
  "ef-print-security-evidence",
  "ef-print-security-unknown",
  "ef-print-security-exception",
];

const HTMLElementBase = globalThis.HTMLElement ?? class {};
class EchelonPrintElement extends HTMLElementBase {}

export function registerPrintElements(registry = globalThis.customElements) {
  if (!registry) return;

  for (const name of elementNames) {
    if (!registry.get(name)) {
      registry.define(name, class extends EchelonPrintElement {});
    }
  }
}

registerPrintElements();

export { elementNames };
