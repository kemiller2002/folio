// Unit and adversarial tests for the pinned Forma icon adapter (GH-45).
// No browser: these exercise pin resolution, registry and byte verification,
// the SVG grammar, rendering semantics and reference compilation.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildIconLibrary,
  compareVersions,
  formaPinFromReleaseSet,
  inspectIconAsset,
  inspectIconRegistry,
  loadFormaPin,
  loadIconLibrary,
  pinPublishesIcons,
  renderFormaPrintIcon,
  renderFormaPrintIconGallery,
  renderIcon,
  sha256Hex
} from "../tools/forma-icons.mjs";
import { compileIconReferences, composeIconPrintDocument, inspectOfflineMarkup } from "../tools/forma-icon-print.mjs";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const fixtureIcons = path.join(root, "tests/fixtures/forma-icons/forma-0.5.0-prerelease/dist/icons");
const fixtureRegistry = JSON.parse(fs.readFileSync(path.join(fixtureIcons, "registry.json"), "utf8"));
const fixtureAssets = new Map(fixtureRegistry.icons.map((entry) => [entry.name, fs.readFileSync(path.join(fixtureIcons, `${entry.name}.svg`))]));
const pin050 = Object.freeze({ systemId: "forma", version: "0.5.0" });
const pin041 = Object.freeze({ systemId: "forma", version: "0.4.1" });
const library = buildIconLibrary({ pin: pin050, registry: fixtureRegistry, assets: fixtureAssets });

const passed = [];
const check = (name, fn) => {
  fn();
  passed.push(name);
};
const codes = (findings) => findings.map((f) => f.code);
const withEntry = (name, change) => ({ ...fixtureRegistry, icons: fixtureRegistry.icons.map((entry) => entry.name === name ? { ...entry, ...change } : entry) });
const withAsset = (name, bytes) => new Map([...fixtureAssets, [name, bytes]]);
/** Tampers an SVG and re-signs its digest, so only the content rules can reject it. */
const resigned = (name, mutate) => {
  const bytes = Buffer.from(mutate(fixtureAssets.get(name).toString("utf8")), "utf8");
  assert.notDeepEqual(bytes, fixtureAssets.get(name), "tampering pattern did not match");
  return buildIconLibrary({ pin: pin050, registry: withEntry(name, { svgSha256: sha256Hex(bytes) }), assets: withAsset(name, bytes) });
};

check("versions compare numerically and reject non-semver", () => {
  assert.equal(compareVersions("0.5.0", "0.4.1"), 1);
  assert.equal(compareVersions("0.10.0", "0.9.9"), 1);
  assert.equal(compareVersions("0.5.0", "0.5.0"), 0);
  assert.equal(compareVersions("0.4.1", "0.5.0"), -1);
  assert.throws(() => compareVersions("latest", "0.5.0"), /Invalid Forma version/);
  assert.equal(pinPublishesIcons(pin041), false);
  assert.equal(pinPublishesIcons(pin050), true);
});

check("the Forma pin comes from the verified Conditor authority", () => {
  const pin = loadFormaPin(root);
  const releaseSet = JSON.parse(fs.readFileSync(path.join(root, ".conditor/authority/resolved-release-set.json"), "utf8"));
  const binding = releaseSet.components.find((c) => c.systemId === "forma");
  assert.equal(pin.version, binding.version);
  assert.equal(pin.tag, binding.tag);
  assert.match(pin.packageSha256, /^[0-9a-f]{64}$/);
  assert.throws(() => formaPinFromReleaseSet({ components: [] }), /no Forma binding/);
  assert.throws(() => formaPinFromReleaseSet({ components: [{ systemId: "forma", version: "main" }] }), /Invalid Forma version/);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "folio-pin-"));
  try {
    fs.mkdirSync(path.join(tmp, ".conditor/authority"), { recursive: true });
    fs.copyFileSync(path.join(root, "conditor.json"), path.join(tmp, "conditor.json"));
    fs.writeFileSync(path.join(tmp, ".conditor/authority/resolved-release-set.json"), JSON.stringify(releaseSet).replace('"0.4.1"', '"0.5.0"'));
    assert.throws(() => loadFormaPin(tmp), /does not match its recorded sha256/, "an edited authority must not silently move the pin");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

check("the pre-release fixture verifies against its own registry digests", () => {
  assert.deepEqual(codes(inspectIconRegistry(fixtureRegistry, pin050)), []);
  assert.equal(library.status, "available");
  assert.equal(library.formaVersion, "0.5.0");
  assert.deepEqual([...library.icons.keys()].sort(), ["clock", "close", "print", "search", "shield", "success", "warning", "workflow"]);
  for (const entry of fixtureRegistry.icons) assert.equal(sha256Hex(fixtureAssets.get(entry.name)), entry.svgSha256);
});

check("an icon-less pin (0.4.1) never reads the disk and renders nothing", () => {
  const unavailable = loadIconLibrary({ pin: pin041, assetsRoot: "/nonexistent/forma/icons" });
  assert.equal(unavailable.status, "unavailable");
  assert.deepEqual(unavailable.findings, []);
  assert.match(unavailable.reason, /predates the static icon registry/);
  assert.deepEqual(renderIcon(unavailable, { name: "warning" }), { state: "unavailable", html: "" });
});

check("missing, malformed or mismatched registries are refused", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "folio-forma-icons-"));
  try {
    assert.deepEqual(codes(loadIconLibrary({ pin: pin050, assetsRoot: tmp }).findings), ["registry.missing"]);
    assert.deepEqual(codes(loadIconLibrary({ pin: pin050 }).findings), ["registry.missing"]);
    fs.writeFileSync(path.join(tmp, "registry.json"), "{ not json");
    assert.ok(codes(loadIconLibrary({ pin: pin050, assetsRoot: tmp }).findings).includes("registry.shape"));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  assert.deepEqual(codes(inspectIconRegistry(fixtureRegistry, { version: "0.5.1" })), ["registry.version"]);
  assert.ok(codes(inspectIconRegistry({ ...fixtureRegistry, formaVersion: undefined }, pin050)).includes("registry.version"));
  assert.ok(codes(inspectIconRegistry({ ...fixtureRegistry, schemaVersion: 2 }, pin050)).includes("registry.schema"));
  assert.ok(codes(inspectIconRegistry({ ...fixtureRegistry, grid: 32 }, pin050)).includes("registry.grid"));
  assert.ok(codes(inspectIconRegistry(withEntry("warning", { svgSha256: undefined }), pin050)).includes("registry.digest"));
  assert.ok(codes(inspectIconRegistry(withEntry("warning", { origin: "third-party" }), pin050)).includes("registry.provenance"));
  assert.ok(codes(inspectIconRegistry(withEntry("warning", { name: "../warning" }), pin050)).includes("registry.entry"));
  assert.ok(codes(inspectIconRegistry(withEntry("warning", { svg: "../../etc/passwd" }), pin050)).includes("registry.entry"));
  assert.ok(codes(inspectIconRegistry({ ...fixtureRegistry, icons: [...fixtureRegistry.icons, fixtureRegistry.icons[0]] }, pin050)).includes("registry.entry"));
  assert.deepEqual(codes(inspectIconRegistry([], pin050)), ["registry.shape"]);
});

check("bundled bytes that differ from the pinned svgSha256 are refused", () => {
  const original = fixtureAssets.get("success");
  const shifted = Buffer.from(original.toString("utf8").replace('r="9"', 'r="8"'), "utf8");
  const tampered = buildIconLibrary({ pin: pin050, registry: fixtureRegistry, assets: withAsset("success", shifted) });
  assert.equal(tampered.status, "unavailable");
  assert.deepEqual(codes(tampered.findings), ["icon.digest"]);
  assert.equal(tampered.icons.size, 0, "no icon of an unverified release is exposed");
  const trailing = Buffer.concat([original, Buffer.from(" ")]);
  assert.deepEqual(codes(inspectIconAsset(fixtureRegistry.icons.find((e) => e.name === "success"), trailing)), ["icon.digest"]);
  const missing = new Map([...fixtureAssets].filter(([name]) => name !== "clock"));
  assert.deepEqual(codes(buildIconLibrary({ pin: pin050, registry: fixtureRegistry, assets: missing }).findings), ["icon.missing"]);
});

check("script, href, foreignObject and other injections are refused even when re-signed", () => {
  const injections = [
    (s) => s.replace("</svg>", "<script>alert(1)</script></svg>"),
    (s) => s.replace("</svg>", '<foreignObject width="24" height="24"><div>x</div></foreignObject></svg>'),
    (s) => s.replace("</svg>", '<a href="https://example.com/"><path d="M1 1L2 2"/></a></svg>'),
    (s) => s.replace("</svg>", '<use href="https://example.com/sprite.svg#x"/></svg>'),
    (s) => s.replace("</svg>", '<image href="data:image/png;base64,AAAA"/></svg>'),
    (s) => s.replace("<svg ", '<svg onload="alert(1)" '),
    (s) => s.replace("</svg>", "<style>path{stroke:red}</style></svg>"),
    (s) => s.replace("</svg>", "<!-- hidden --></svg>"),
    (s) => s.replace('stroke="currentColor"', 'stroke="red"'),
    (s) => s.replace('viewBox="0 0 24 24"', 'viewBox="0 0 48 48"'),
    (s) => s.replace("<circle ", '<circle fill="url(https://example.com/x)" ')
  ];
  for (const inject of injections) {
    const result = resigned("success", inject);
    assert.equal(result.status, "unavailable", inject.toString());
    assert.ok(codes(result.findings).some((code) => code === "icon.markup" || code === "icon.grammar"), `${inject}: ${codes(result.findings)}`);
    assert.ok(!codes(result.findings).includes("icon.digest"), "re-signed, so only content rules may refuse it");
  }
});

check("rendered icons are decorative unless the document names them, and escape labels", () => {
  const decorative = renderIcon(library, { name: "warning" });
  assert.equal(decorative.state, "rendered");
  assert.match(decorative.html, /^<span class="ef-print-icon" data-ef-icon="warning" data-ef-icon-forma="0\.5\.0" style="--ef-print-icon-size:1em" aria-hidden="true"><svg aria-hidden="true" focusable="false" xmlns=/);
  assert.ok(decorative.html.includes(fixtureAssets.get("warning").toString("utf8").trim().replace("<svg ", '<svg aria-hidden="true" focusable="false" ')), "geometry is embedded verbatim");
  assert.doesNotMatch(decorative.html.replaceAll("http://www.w3.org/2000/svg", ""), /<script|https?:|<iframe|role=/i);
  const meaningful = renderIcon(library, { name: "workflow", label: 'Stage "release" & <done>', size: "14pt" });
  assert.match(meaningful.html, /role="img" aria-label="Stage &quot;release&quot; &amp; &lt;done&gt;"/);
  assert.doesNotMatch(meaningful.html, /aria-hidden="true"><svg/);
  assert.match(meaningful.html, /--ef-print-icon-size:14pt/);
});

check("unknown, invalid and unsafe references are inert, never thrown", () => {
  assert.deepEqual(renderIcon(library, { name: "future-rocket" }), { state: "unknown", html: "" });
  assert.deepEqual(renderIcon(library, { name: "../warning" }), { state: "invalid", html: "" });
  assert.deepEqual(renderIcon(library, { name: "warning", size: "10pt;background:url(x)" }), { state: "invalid", html: "" });
  assert.deepEqual(renderIcon(library, { name: "warning", label: "   " }), { state: "invalid", html: "" });
  assert.deepEqual(renderIcon(library, { name: "warning", label: "x".repeat(181) }), { state: "invalid", html: "" });
});

check("the strict build-script API keeps its explicit contract", () => {
  const options = { assetsRoot: fixtureIcons, formaVersion: "0.5.0" };
  assert.match(renderFormaPrintIcon("success", options), /data-ef-icon="success"/);
  assert.equal(renderFormaPrintIconGallery(["success", "warning"], options).split("\n").length, 2);
  assert.throws(() => renderFormaPrintIcon("success", { assetsRoot: fixtureIcons }), /explicit pinned formaVersion required/);
  assert.throws(() => renderFormaPrintIcon("success", { assetsRoot: fixtureIcons, formaVersion: "0.4.1" }), /predates the static icon registry/);
  assert.throws(() => renderFormaPrintIcon("success", { assetsRoot: fixtureIcons, formaVersion: "0.5.1" }), /registry\.version/);
  assert.throws(() => renderFormaPrintIcon("delete", options), /unknown icon/);
  assert.throws(() => renderFormaPrintIcon("../add", options), /invalid name/);
  assert.throws(() => renderFormaPrintIcon("success", { ...options, size: "10pt;background:url(x)" }), /unsafe size/);
  assert.throws(() => renderFormaPrintIconGallery("success", options), /list of IDs/);
});

check("reference compilation renders known icons and preserves the rest as hidden data", () => {
  const body = '<p><span data-ef-icon="success"></span> Passed <span data-ef-icon="future-rocket" data-ef-icon-label="Launch &amp; go"></span> <span data-ef-icon="&quot;&gt;&lt;script&gt;"></span></p>';
  const compiled = compileIconReferences(body, library);
  assert.deepEqual(compiled.references.map((r) => [r.name, r.state]), [["success", "rendered"], ["future-rocket", "unknown"], ['"><script>', "invalid"]]);
  assert.deepEqual(compiled.findings, []);
  assert.match(compiled.html, /<span data-ef-icon="future-rocket" data-ef-icon-label="Launch &amp; go" data-ef-icon-state="unknown" hidden><\/span>/);
  assert.match(compiled.html, /<span data-ef-icon="&quot;&gt;&lt;script&gt;" data-ef-icon-state="invalid" hidden><\/span>/);
  assert.doesNotMatch(compiled.html, /<script/);
  const unavailableCompiled = () => compileIconReferences(body, buildIconLibrary({ pin: pin041, registry: null, assets: new Map() }));
  const unavailable = unavailableCompiled();
  assert.deepEqual(unavailable.references.map((r) => r.state), ["unavailable", "unavailable", "invalid"]);
  assert.doesNotMatch(unavailable.html, /<svg/);
  const again = compileIconReferences(compiled.html, library);
  assert.equal(again.html, compiled.html, "compiling twice is stable");
  assert.deepEqual(again.references.map((r) => r.name), ["future-rocket", '"><script>'], "rendered icons are not references; inert ones stay resolvable");
  assert.deepEqual(again.findings, []);
  const later = compileIconReferences(unavailableCompiled().html, library);
  assert.deepEqual(later.references.map((r) => r.state), ["rendered", "unknown", "invalid"], "references kept under an icon-less pin resolve once a verified release is used");
  const malformed = compileIconReferences('<span data-ef-icon="warning" onclick="x()"></span>', library);
  assert.deepEqual(codes(malformed.findings), ["icon.reference"]);
});

check("documents that could reach the network are refused before printing", () => {
  const compose = (body, documentCss = "") => composeIconPrintDocument({ title: "t", body, page: "a4", library, documentCss });
  assert.doesNotThrow(() => compose('<p><a href="#x">x</a> <span data-ef-icon="success"></span></p>'));
  for (const [body, css] of [
    ['<img src="https://example.com/x.png" alt="">', ""],
    ['<link rel="stylesheet" href="https://example.com/x.css">', ""],
    ['<script src="https://example.com/x.js"></script>', ""],
    ["<script>fetch('/x')</script>", ""],
    ['<a href="https://example.com/">x</a>', ""],
    ['<object data="x.svg"></object>', ""],
    ['<p onmouseover="x()">x</p>', ""],
    ["<p>x</p>", "body { background: url(https://example.com/x.png); }"],
    ["<p>x</p>", '@import "https://example.com/x.css";']
  ]) {
    assert.throws(() => compose(body, css), /not offline-safe/, body + css);
  }
  assert.ok(inspectOfflineMarkup('<svg xmlns="http://www.w3.org/2000/svg"></svg>').length === 0, "the SVG namespace is not a request");
  assert.throws(() => compose('<span data-ef-icon="success" onclick="x()"></span>'), /not well-formed/);
  const failed = buildIconLibrary({ pin: pin050, registry: withEntry("success", { svgSha256: "0".repeat(64) }), assets: fixtureAssets });
  assert.throws(() => composeIconPrintDocument({ title: "t", body: "<p>x</p>", library: failed }), /Refusing to print with an unverified Forma 0\.5\.0 icon release: icon\.digest/);
  assert.throws(() => composeIconPrintDocument({ title: "t", body: "<p>x</p>", page: "legal", library }), /Unknown page profile/);
});

console.log(`PASS Folio Forma icon adapter: ${passed.length} checks`);
for (const name of passed) console.log(`  ok - ${name}`);
