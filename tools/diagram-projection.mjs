// Folio print composition for Forma Studio diagram projections
// (docs/requirements/OBJECT-METADATA-AND-DIAGRAM-PRINT.md, EPC-DIAG-*, #25).
//
// Build-time/test-time only. Folio never interprets graph semantics here: it
// checks the handoff, plans page fitting from the projection's bounds, and composes
// an ordinary Folio document from existing primitives (ef-print-section,
// ef-print-figure, ef-print-table, ef-print-note). The projection markup is embedded
// verbatim; fitting is a CSS zoom on the viewport and never rewrites geometry
// (EPC-DIAG-HANDOFF-005, EPC-DIAG-028).
import { createHash } from "node:crypto";

export const supportedProjectionMajor = 1;
export const minimumTextPt = 7;
export const minimumStrokePt = 0.5;
/** The 16px basis Studio lays diagrams out against; set as the print root (12pt). */
export const diagramRootFontPx = 16;
const cssPxPerInch = 96;
const pointsPerCssPx = 0.75;

export const pageProfiles = Object.freeze({
  "letter-portrait": { label: "Letter portrait", css: "letter portrait", widthIn: 8.5, heightIn: 11 },
  "letter-landscape": { label: "Letter landscape", css: "letter landscape", widthIn: 11, heightIn: 8.5 },
  "a4-portrait": { label: "A4 portrait", css: "A4 portrait", widthIn: 210 / 25.4, heightIn: 297 / 25.4 },
  "a4-landscape": { label: "A4 landscape", css: "A4 landscape", widthIn: 297 / 25.4, heightIn: 210 / 25.4 }
});

const rotated = (name) =>
  name.endsWith("-portrait") ? name.replace("-portrait", "-landscape") : name.replace("-landscape", "-portrait");

const sha256 = (text) => `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;

const finding = (code, message) => ({ code, message });

// Markup a projection may never contain. The projection is untrusted input at this
// boundary (EPC-DIAG-SEC-001..005, EPC-DIAG-LINK-003).
const forbiddenMarkup = [
  [/<script\b/i, "script element"],
  [/<(iframe|object|embed|foreignObject|image|use|link|meta|base|form|input|button|img)\b/i, "active or external-resource element"],
  [/<[^>]*\son[a-z]+\s*=/i, "event-handler attribute"],
  [/javascript:|vbscript:|data:text\/html/i, "dangerous URL scheme"],
  [/<!--/, "comment (could carry hidden data)"],
  [/\s(href|src|xlink:href)\s*=\s*"(?!#)/i, "external reference"],
  [/\sdata-(?!ef-(shape|line|group|value-state)=)[a-z-]+=/i, "undocumented data attribute"]
];

// Style values are limited to Forma custom properties with validated values.
const allowedStyle = /^(--ef-diagram-[a-z-]+: (-?\d+px|\d+|#[0-9a-f]{6}|var\(--ef-color-[a-z-]+\));\s?)+$/;

// Editor state Studio must strip before export (EPC-DIAG-007/008, FDA-246).
const editorState = /\b(selection|handle|guide|minimap|marquee|route-preview|hover)\b/i;

/**
 * Checks a projection before printing. Returns findings; an empty list means the
 * projection may be composed. `requiredRevision` enforces freshness
 * (EPC-DIAG-HANDOFF-003).
 */
export const inspectProjection = (manifest, html, { requiredRevision } = {}) => {
  const major = Number(String(manifest?.projectionVersion ?? "").split(".")[0]);
  const classes = [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean);
  const styles = [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1]);
  return [
    ...(manifest?.kind === "forma-studio.diagram-projection" ? [] : [finding("projection.kind", "Not a Forma Studio diagram projection.")]),
    ...(major === supportedProjectionMajor ? [] : [finding("projection.version", `Projection version ${manifest?.projectionVersion} is not supported (major ${supportedProjectionMajor}).`)]),
    ...(manifest?.scope === "rendered" ? [] : [finding("projection.scope", `Scope '${manifest?.scope}' is not authorized for ordinary print output.`)]),
    ...(manifest?.status === "valid" ? [] : [finding("projection.status", "The projection is diagnostic or invalid; strict print refuses it.")]),
    ...(manifest?.content?.sha256 === sha256(html) ? [] : [finding("projection.digest", "The markup does not match the manifest digest.")]),
    ...(requiredRevision && manifest?.source?.revision !== requiredRevision
      ? [finding("projection.stale", "The projection's source revision differs from the requested revision.")]
      : []),
    ...(manifest?.presentation?.contract === "forma.diagram-presentation" && String(manifest?.presentation?.contractVersion ?? "").startsWith("2.")
      ? []
      : [finding("projection.presentation", "A required public Forma diagram contract (2.x) is not declared.")]),
    ...forbiddenMarkup.filter(([pattern]) => pattern.test(html)).map(([, label]) => finding("projection.markup", `Forbidden ${label}.`)),
    ...classes.filter((c) => !c.startsWith("ef-diagram")).map((c) => finding("projection.class", `Class '${c}' is not part of the public Forma diagram contract.`)),
    ...classes.filter((c) => editorState.test(c)).map((c) => finding("projection.editor-state", `Editor state '${c}' leaked into the projection.`)),
    ...styles.filter((s) => !allowedStyle.test(s)).map((s) => finding("projection.style", `Style '${s}' is outside the allowed presentation values.`))
  ];
};

/**
 * Plans page fitting from projection bounds (EPC-DIAG-020..029, EPC-DIAG-SCALE-*).
 * Text is never shrunk below `minimumTextPt`: the plan rotates to the other
 * orientation first, and reports that tiling is required when neither fits.
 */
export const planFit = (manifest, profileName, options = {}) => {
    // reservedHeightIn covers the figure caption and its one-line description, which
  // print above the canvas at full size on the diagram page (composeDocument keeps
  // each to one line and tightens the figure gap).
    // Forma sizes diagram text in rem. The smallest diagram text is the 0.75rem
  // value-state tag, so the document root size decides legibility together with
  // the fit scale. composeDocument sets the same root size.
  const { rootFontPx = diagramRootFontPx, smallestTextRem = 0.75, strokePx = 2, marginIn = 0.5, reservedHeightIn = 0.85, allowRotation = true, minimumText = minimumTextPt } = options;
  const smallestTextPx = rootFontPx * smallestTextRem;
  const { canvasWidth, canvasHeight } = manifest.bounds;
  const evaluate = (name) => {
    const profile = pageProfiles[name];
    const availableWidth = (profile.widthIn - 2 * marginIn) * cssPxPerInch;
    const availableHeight = (profile.heightIn - 2 * marginIn - reservedHeightIn) * cssPxPerInch;
    const scale = Math.min(1, availableWidth / canvasWidth, availableHeight / canvasHeight);
    const rounded = Math.floor(scale * 1000) / 1000;
    return {
      profile: name,
      label: profile.label,
      pageCss: profile.css,
      scale: rounded,
      textPt: Number((smallestTextPx * rounded * pointsPerCssPx).toFixed(2)),
      strokePt: Number((strokePx * rounded * pointsPerCssPx).toFixed(2))
    };
  };
  const legible = (plan) => plan.textPt >= minimumText && plan.strokePt >= minimumStrokePt;
  const requested = evaluate(profileName);
  if (legible(requested)) {
    return { ...requested, strategy: requested.scale === 1 ? "actual-size" : "fit", reasons: [] };
  }
  const alternative = allowRotation ? evaluate(rotated(profileName)) : undefined;
  if (alternative && legible(alternative)) {
    return {
      ...alternative,
      strategy: "rotated-fit",
      reasons: [`${requested.label} would scale text to ${requested.textPt}pt, below the ${minimumText}pt minimum; ${alternative.label} keeps it at ${alternative.textPt}pt.`]
    };
  }
  return {
    ...requested,
    strategy: "tile-required",
    reasons: [`No ${allowRotation ? "orientation" : "allowed orientation"} keeps text at or above ${minimumText}pt; use tiling or a larger page.`]
  };
};

const escapeHtml = (text) =>
  String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

const metadataText = (values) =>
  values
    .map((v) => `${v.label}: ${v.text ?? ""}${v.state === "explicit" || !v.note ? "" : `${v.text ? " " : ""}(${v.note})`}`)
    .join("; ");

/**
 * Composes a Folio document around the projection. The markup is inserted verbatim;
 * the metadata index is keyed by stable object ids and links to each object
 * (EPC-DIAG-063..065, EPC-DIAG-151). Only rendered-scope values from the manifest
 * are used, so nothing withheld by Studio can appear (EPC-META-DISCLOSE-003).
 */
export const composeDocument = ({ manifest, html, plan, assets, colorMode = "color" }) => {
  if (plan.strategy === "tile-required") throw new Error(`Cannot compose a single-page diagram: ${plan.reasons.join(" ")}`);
  const nodes = manifest.objects.filter((o) => o.role === "node");
  const rows = nodes
    .map((o) => `          <tr><th scope="row"><a href="#${escapeHtml(o.elementId)}">${escapeHtml(o.id)}</a></th><td>${escapeHtml(o.label)}</td><td>${escapeHtml(o.kindLabel)}</td><td>${escapeHtml(metadataText(o.renderedMetadata))}</td></tr>`)
    .join("\n");
  const provenance = [
    ["Source diagram", `${manifest.source.diagramName} (${manifest.source.diagramId})`],
    ["Source revision", manifest.source.revision],
    ["Projection", `${manifest.kind} ${manifest.projectionVersion}`],
    ["Presentation", `${manifest.presentation.contract} ${manifest.presentation.contractVersion} (Forma ${manifest.presentation.formaVersion})`],
    ["Page", `${plan.label}, ${plan.strategy}, scale ${plan.scale} (smallest text ${plan.textPt}pt)`],
    ["Color mode", colorMode]
  ]
    .map(([term, value]) => `          <dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(manifest.source.diagramName)}</title>
  <link rel="stylesheet" href="${assets.forma}/tokens.css">
  <link rel="stylesheet" href="${assets.forma}/foundations.css">
  <link rel="stylesheet" href="${assets.forma}/components.css">
  <link rel="stylesheet" href="${assets.folio}/src/styles/print.css">
  <script type="module" src="${assets.folio}/src/components/register.js"></script>
  <style>
    /* Consumer document CSS: page profile and fit scale chosen by planFit. The
       12pt root matches the 16px basis the diagram was laid out against. */
    :root { --ef-print-font-size: ${diagramRootFontPx * 0.75}pt; }
    @page diagram { size: ${plan.pageCss}; margin: 0.5in; }
    ef-print-section.diagram-page { page: diagram; }
    body { background: #fff; }
    ef-print-figure.diagram-fit { margin-block: 0; }
    .diagram-fit .ef-diagram { gap: 0.5rem; }
    .diagram-fit .ef-diagram > p { margin: 0; max-inline-size: none; }
    .diagram-fit .ef-diagram__viewport { zoom: ${plan.scale}; overflow: visible; border: 0; break-inside: avoid; }
    .diagram-index td:nth-child(3) { white-space: nowrap; }
  </style>
</head>
<body data-color-mode="${escapeHtml(colorMode)}">
  <ef-print-document>
    <ef-print-section class="diagram-page">
      <ef-print-figure class="diagram-fit" data-diagram="${escapeHtml(manifest.source.diagramId)}">
${html.trimEnd()}
      </ef-print-figure>
      <h2>Items and printed metadata</h2>
      <ef-print-table>
        <table class="diagram-index">
          <caption>Items and their printed metadata</caption>
          <thead><tr><th scope="col">ID</th><th scope="col">Item</th><th scope="col">Kind</th><th scope="col">Metadata</th></tr></thead>
          <tbody>
${rows}
          </tbody>
        </table>
      </ef-print-table>
      <ef-print-note>
        <dl>
${provenance}
        </dl>
      </ef-print-note>
    </ef-print-section>
  </ef-print-document>
</body>
</html>
`;
};
