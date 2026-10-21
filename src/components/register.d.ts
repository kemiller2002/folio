import "../runtime.js";

export declare const elementNames: readonly [
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
  "ef-print-security-exception"
];

export declare function registerPrintElements(registry?: CustomElementRegistry): void;

declare global {
  interface HTMLElementTagNameMap {
    "ef-print-document": HTMLElement;
    "ef-print-title-page": HTMLElement;
    "ef-print-section": HTMLElement;
    "ef-print-back-page": HTMLElement;
    "ef-print-header": HTMLElement;
    "ef-print-footer": HTMLElement;
    "ef-print-page-number": HTMLElement;
    "ef-print-columns": HTMLElement;
    "ef-print-sidebar": HTMLElement;
    "ef-print-layer": HTMLElement;
    "ef-print-break": HTMLElement;
    "ef-print-keep": HTMLElement;
    "ef-print-metric": HTMLElement;
    "ef-print-integrity": HTMLElement;
    "ef-print-finding": HTMLElement;
    "ef-print-callout": HTMLElement;
    "ef-print-figure": HTMLElement;
    "ef-print-table": HTMLElement;
    "ef-print-code": HTMLElement;
    "ef-print-toc": HTMLElement;
    "ef-print-note": HTMLElement;
    "ef-print-security-record": HTMLElement;
    "ef-print-security-posture": HTMLElement;
    "ef-print-security-invariant": HTMLElement;
    "ef-print-security-evidence": HTMLElement;
    "ef-print-security-unknown": HTMLElement;
    "ef-print-security-exception": HTMLElement;
  }
}

export {};
