// Folio print/PDF composition for pinned Forma icons (GH-45, Forma ICON-009,
// ICON-013, ICON-014, ICON-015).
//
// Authors write inert icon references in ordinary Folio HTML:
//
//   <span data-ef-icon="warning"></span> Warning: two checks need review
//   <span data-ef-icon="workflow" data-ef-icon-label="Workflow stage"></span>
//
// Before upgrade the reference renders nothing, so the printed words carry the
// meaning. `compileIconReferences` replaces each reference with the verified,
// release-pinned static SVG from a `tools/forma-icons.mjs` library. Unknown or
// future names, and every reference under an icon-less Forma pin, stay in the
// document as hidden inert data instead of failing or being guessed; compiling
// again with a newer verified library resolves them.
//
// `composeIconPrintDocument` produces one self-contained, script-free HTML
// document (stylesheets inlined, no URL of any kind), so the same file prints
// offline. `openOfflineDocument` and `printOfflinePdf` drive an injected
// Playwright page with every network request blocked and recorded; Folio does
// not import a browser here. Everything except those two is pure.
import { escapeHtml, renderIcon } from "./forma-icons.mjs";

export const pageProfiles = Object.freeze({
  letter: Object.freeze({ label: "Letter portrait", css: "letter portrait", format: "Letter", widthPt: 612, heightPt: 792 }),
  a4: Object.freeze({ label: "A4 portrait", css: "A4 portrait", format: "A4", widthPt: 595.28, heightPt: 841.89 })
});

const finding = (code, message) => Object.freeze({ code, message });

const reference = /<span data-ef-icon="([^"<>]*)"(?: data-ef-icon-label="([^"<>]*)")?(?: data-ef-icon-size="([^"<>]*)")?(?: data-ef-icon-state="[a-z]+" hidden)?><\/span>/g;
const anyReference = /data-ef-icon="/g;
const renderedIcon = /<span class="ef-print-icon" data-ef-icon="/g;

const decodeAttribute = (value) =>
  value.replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");

const inertReference = ({ name, label, size }, state) =>
  `<span data-ef-icon="${escapeHtml(name)}"${label === null ? "" : ` data-ef-icon-label="${escapeHtml(label)}"`}${size === null ? "" : ` data-ef-icon-size="${escapeHtml(size)}"`} data-ef-icon-state="${state}" hidden></span>`;

/**
 * Replaces authored icon references with verified static icons (pure).
 * Returns the compiled HTML, one record per reference, and findings for any
 * `data-ef-icon` attribute that is not a well-formed reference.
 */
export const compileIconReferences = (html, library) => {
  const matches = [...html.matchAll(reference)];
  const parsed = matches.map((match) => Object.freeze({
    name: decodeAttribute(match[1]),
    label: match[2] === undefined ? null : decodeAttribute(match[2]),
    size: match[3] === undefined ? null : decodeAttribute(match[3])
  }));
  const results = parsed.map((ref) => {
    const rendered = renderIcon(library, { name: ref.name, label: ref.label, ...(ref.size === null ? {} : { size: ref.size }) });
    return Object.freeze({
      name: ref.name,
      label: ref.label,
      state: rendered.state,
      html: rendered.state === "rendered" ? rendered.html : inertReference(ref, rendered.state)
    });
  });
  // Right to left, so earlier match offsets stay valid.
  const compiled = matches.reduceRight(
    (text, match, index) => text.slice(0, match.index) + results[index].html + text.slice(match.index + match[0].length),
    html
  );
  const attributeCount = (html.match(anyReference) ?? []).length - (html.match(renderedIcon) ?? []).length;
  return Object.freeze({
    html: compiled,
    references: Object.freeze(results.map(({ name, label, state }) => Object.freeze({ name, label, state }))),
    findings: Object.freeze(attributeCount === parsed.length
      ? []
      : [finding("icon.reference", `${attributeCount - parsed.length} data-ef-icon attribute(s) are not well-formed empty icon references.`)])
  });
};

// Anything that could make a printed document reach the network or run code.
// The SVG namespace declaration is an identifier, not a request.
const offlineViolations = Object.freeze([
  [/<script\b/i, "script element"],
  [/<(?:link|base|iframe|frame|object|embed|img|picture|source|video|audio|track|image|use|foreignObject|form|input|button)\b/i, "external-resource or active element"],
  [/<meta\b[^>]*http-equiv/i, "http-equiv meta"],
  [/@import\b/i, "@import"],
  [/url\((?!\s*["']?#)/i, "CSS url() reference"],
  [/\s(?:src|srcset|href|xlink:href|poster|data|action|formaction|background|ping)\s*=\s*(?!["']?#)/i, "external URL attribute"],
  [/\son[a-z]+\s*=/i, "event-handler attribute"],
  [/javascript:|vbscript:/i, "script URL"]
]);

/** Static check that a document can print with no network access (pure). */
export const inspectOfflineMarkup = (html) =>
  Object.freeze(offlineViolations
    .filter(([pattern]) => pattern.test(html.replaceAll('xmlns="http://www.w3.org/2000/svg"', "")))
    .map(([, label]) => finding("offline.reference", `Document contains a forbidden ${label}.`)));

/**
 * Composes a self-contained Folio print document (pure). `stylesheets` are CSS
 * strings (normally Folio's `print.css`) inlined in order, followed by the
 * consumer's `documentCss`. Throws, like strict diagram print, when the icon
 * release failed verification or the result would not be offline-safe.
 */
export const composeIconPrintDocument = ({ title, lang = "en", body, page = "letter", stylesheets = [], documentCss = "", library }) => {
  const profile = pageProfiles[page];
  if (!profile) throw new Error(`Unknown page profile '${page}'`);
  if (library.findings.length) {
    throw new Error(`Refusing to print with an unverified Forma ${library.formaVersion} icon release: ${library.findings.map((f) => `${f.code}: ${f.message}`).join(" ")}`);
  }
  const compiled = compileIconReferences(body, library);
  if (compiled.findings.length) throw new Error(compiled.findings.map((f) => f.message).join(" "));
  const css = [...stylesheets, `@page { size: ${profile.css}; }`, documentCss].join("\n");
  const html = `<!doctype html>
<html lang="${escapeHtml(lang)}" data-ef-page="${page}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="folio-forma-version" content="${escapeHtml(library.formaVersion)}">
  <meta name="folio-forma-icons" content="${library.status}">
  <title>${escapeHtml(title)}</title>
  <style>
${css}
  </style>
</head>
<body>
${compiled.html.trimEnd()}
</body>
</html>
`;
  const offline = inspectOfflineMarkup(html);
  if (offline.length) throw new Error(`Document is not offline-safe: ${offline.map((f) => f.message).join(" ")}`);
  return Object.freeze({ html, page: profile, references: compiled.references, formaVersion: library.formaVersion, iconStatus: library.status });
};

/**
 * Loads `html` into an injected Playwright page with every network request
 * aborted and recorded. Returns a reader for the observed request URLs.
 */
export const openOfflineDocument = async (page, html, { media = "print", forcedColors } = {}) => {
  const observed = [];
  page.on("request", (request) => observed.push(request.url()));
  await page.route("**/*", (route) => route.abort("blockedbyclient"));
  await page.emulateMedia({ media, ...(forcedColors ? { forcedColors } : {}) });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  return Object.freeze({ requests: () => Object.freeze([...observed]) });
};

/** Prints a composed document offline to a PDF buffer with Chromium's page.pdf. */
export const printOfflinePdf = async (page, composed, { printBackground = true, path, tagged = true } = {}) => {
  const session = await openOfflineDocument(page, composed.html);
  const pdf = await page.pdf({
    path,
    preferCSSPageSize: true,
    printBackground,
    displayHeaderFooter: false,
    tagged,
    outline: false
  });
  return Object.freeze({ pdf, requests: session.requests() });
};
