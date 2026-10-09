// Folio consumes static, release-pinned Forma icon *artifacts* (GH-45,
// Forma ICON-002/003/007/013/016/018). Folio never owns, copies or redraws
// canonical geometry: it verifies the bytes a pinned Forma release bundled
// (registry `formaVersion` + per-icon `svgSha256`), checks them against a
// restricted SVG grammar, and embeds them verbatim at build time.
//
// Pure functions inspect and render; the only I/O is in the explicitly named
// `load*` functions. Every returned value is frozen. Nothing fetches a URL,
// guesses a mutable branch, or keeps module-level mutable state.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/** The first Forma release whose package publishes `dist/icons/registry.json`. */
export const iconRegistryMinimumFormaVersion = "0.5.0";
export const supportedRegistrySchemaVersion = 1;
export const iconGrid = 24;
const maximumSvgBytes = 16000;

const stableName = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const hexDigest = /^[0-9a-f]{64}$/;
const semver = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;
const safeSize = /^(?:\d+(?:\.\d+)?)(?:em|rem|px|pt)$/;
const svgRoot = /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" class="ef-icon__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1\.8" stroke-linecap="round" stroke-linejoin="round">([\s\S]*)<\/svg>\s*$/;
const safeGeometry = /^(?:<path d="[MmLlHhVvCcSsQqTtAaZz0-9\s.,+-]+"\/>|<circle cx="[\d.]+" cy="[\d.]+" r="[\d.]+"\/>|<rect x="[\d.]+" y="[\d.]+" width="[\d.]+" height="[\d.]+"(?: rx="[\d.]+")?\/>)+$/;

// Defence in depth: named so a finding says *what* was refused, even though the
// grammar above would also reject each of these.
const forbiddenSvg = Object.freeze([
  [/<script\b/i, "script element"],
  [/<foreignObject\b/i, "foreignObject element"],
  [/<(?:image|use|iframe|object|embed|style|a)\b/i, "active, styled or external-resource element"],
  [/\son[a-z]+\s*=/i, "event-handler attribute"],
  [/\s(?:href|xlink:href|src)\s*=/i, "hyperlink or external reference"],
  [/javascript:|vbscript:|data:/i, "dangerous URL scheme"],
  [/<!--|<!DOCTYPE|<!ENTITY|<\?/i, "comment, doctype, entity or processing instruction"]
]);

const finding = (code, message) => Object.freeze({ code, message });
const freezeAll = (items) => Object.freeze([...items]);
export const sha256Hex = (bytes) => createHash("sha256").update(bytes).digest("hex");

export const escapeHtml = (text) =>
  String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

/** Compares two release versions; returns -1, 0 or 1. Throws on non-semver input. */
export const compareVersions = (left, right) => {
  const parse = (value) => {
    const match = semver.exec(String(value ?? ""));
    if (!match) throw new Error(`Invalid Forma version '${value}'`);
    return match.slice(1, 4).map(Number);
  };
  const [a, b] = [parse(left), parse(right)];
  const index = a.findIndex((part, i) => part !== b[i]);
  return index === -1 ? 0 : Math.sign(a[index] - b[index]);
};

/** True when the pinned Forma release publishes the static icon registry. */
export const pinPublishesIcons = (pin) => compareVersions(pin.version, iconRegistryMinimumFormaVersion) >= 0;

/**
 * Reads the Forma binding out of a Conditor resolved release set (pure). The pin
 * is the single source of the Forma version Folio is allowed to consume.
 */
export const formaPinFromReleaseSet = (releaseSet) => {
  const binding = (Array.isArray(releaseSet?.components) ? releaseSet.components : []).find((entry) => entry?.systemId === "forma");
  if (!binding) throw new Error("The resolved release set has no Forma binding");
  compareVersions(binding.version, binding.version);
  return Object.freeze({
    systemId: "forma",
    version: binding.version,
    tag: binding.tag ?? null,
    commit: binding.commit ?? null,
    releaseStage: binding.releaseStage ?? null,
    packageSha256: binding.artifacts?.find((artifact) => artifact?.purpose === "package")?.sha256 ?? null,
    source: "conditor-resolved-release-set"
  });
};

/** I/O: the Forma pin recorded in a repository's verified Conditor authority. */
export const loadFormaPin = (repositoryRoot) => {
  const conditor = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "conditor.json"), "utf8"));
  const bytes = fs.readFileSync(path.join(repositoryRoot, conditor.registryAuthority.path));
  if (sha256Hex(bytes) !== conditor.registryAuthority.sha256) {
    throw new Error(`Conditor authority ${conditor.registryAuthority.path} does not match its recorded sha256`);
  }
  return formaPinFromReleaseSet(JSON.parse(bytes.toString("utf8")));
};

/** Checks a registry against the Forma v1 artifact contract and the pin (pure). */
export const inspectIconRegistry = (registry, pin) => {
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    return freezeAll([finding("registry.shape", "The icon registry is not a JSON object.")]);
  }
  const icons = Array.isArray(registry.icons) ? registry.icons : [];
  const names = icons.map((row) => row?.name);
  const entryFindings = icons.flatMap((row, index) => {
    const name = row?.name;
    const where = typeof name === "string" && stableName.test(name) ? `'${name}'` : `#${index}`;
    return [
      ...(typeof name === "string" && stableName.test(name) ? [] : [finding("registry.entry", `Icon ${where} has an invalid identifier.`)]),
      ...(names.indexOf(name) === index ? [] : [finding("registry.entry", `Icon ${where} is duplicated.`)]),
      ...(row?.svg === `icons/${name}.svg` && row?.html === `icons/html/${name}.html`
        ? []
        : [finding("registry.entry", `Icon ${where} does not use the Forma v1 asset locations.`)]),
      ...(row?.origin === "original" ? [] : [finding("registry.provenance", `Icon ${where} has an unsupported origin.`)]),
      ...(typeof row?.svgSha256 === "string" && hexDigest.test(row.svgSha256)
        ? []
        : [finding("registry.digest", `Icon ${where} has no svgSha256 digest; bundled geometry cannot be verified.`)]),
      ...(typeof row?.label === "string" && row.label.trim() ? [] : [finding("registry.entry", `Icon ${where} has no label.`)])
    ];
  });
  return freezeAll([
    ...(registry.schemaVersion === supportedRegistrySchemaVersion ? [] : [finding("registry.schema", `Registry schemaVersion ${registry.schemaVersion} is not supported.`)]),
    ...(registry.grid === iconGrid ? [] : [finding("registry.grid", `Registry grid ${registry.grid} is not ${iconGrid}.`)]),
    ...(Array.isArray(registry.icons) ? [] : [finding("registry.shape", "The registry has no icons array.")]),
    ...(registry.formaVersion === pin.version
      ? []
      : [finding("registry.version", `Registry formaVersion '${registry.formaVersion}' does not match the pinned Forma ${pin.version}.`)]),
    ...entryFindings
  ]);
};

/** Checks one bundled SVG's bytes against its registry digest and the grammar (pure). */
export const inspectIconAsset = (entry, bytes) => {
  if (bytes === undefined || bytes === null) return freezeAll([finding("icon.missing", `Icon '${entry.name}' has no bundled SVG.`)]);
  const source = Buffer.from(bytes).toString("utf8");
  const root = svgRoot.exec(source);
  return freezeAll([
    ...(sha256Hex(bytes) === entry.svgSha256
      ? []
      : [finding("icon.digest", `Icon '${entry.name}' bytes do not match the pinned registry svgSha256.`)]),
    ...(bytes.length <= maximumSvgBytes ? [] : [finding("icon.size", `Icon '${entry.name}' exceeds ${maximumSvgBytes} bytes.`)]),
    ...forbiddenSvg.filter(([pattern]) => pattern.test(source)).map(([, label]) => finding("icon.markup", `Icon '${entry.name}' contains a forbidden ${label}.`)),
    ...(root && safeGeometry.test(root[1]) ? [] : [finding("icon.grammar", `Icon '${entry.name}' is outside the Forma static SVG grammar.`)])
  ]);
};

const unavailableLibrary = (pin, reason, findings = []) =>
  Object.freeze({ status: "unavailable", pin, formaVersion: pin.version, reason, icons: new Map(), findings: freezeAll(findings) });

/**
 * Builds an immutable icon library from an already-read registry and asset bytes
 * (pure). `assets` maps icon name to its SVG bytes. Any finding makes the library
 * unusable; no icon from an unverified release is ever exposed. Callers must not
 * mutate the returned `icons` map.
 */
export const buildIconLibrary = ({ pin, registry, assets }) => {
  if (!pinPublishesIcons(pin)) {
    return unavailableLibrary(pin, `Pinned Forma ${pin.version} predates the static icon registry (${iconRegistryMinimumFormaVersion}).`);
  }
  const registryFindings = inspectIconRegistry(registry, pin);
  if (registryFindings.length) return unavailableLibrary(pin, "The icon registry failed verification.", registryFindings);
  const assetFindings = registry.icons.flatMap((entry) => inspectIconAsset(entry, assets.get(entry.name)));
  if (assetFindings.length) return unavailableLibrary(pin, "Bundled icon geometry failed verification.", assetFindings);
  const icons = new Map(registry.icons.map((entry) => [
    entry.name,
    Object.freeze({
      name: entry.name,
      label: entry.label,
      category: entry.category,
      svgSha256: entry.svgSha256,
      svg: Buffer.from(assets.get(entry.name)).toString("utf8").trim()
    })
  ]));
  return Object.freeze({ status: "available", pin, formaVersion: registry.formaVersion, reason: null, icons, findings: freezeAll([]) });
};

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
};

/**
 * I/O: loads the icon library for `pin` from a local copy of the pinned Forma
 * package's `dist/icons` directory. A pin older than 0.5.0 never touches the disk.
 */
export const loadIconLibrary = ({ pin, assetsRoot }) => {
  if (!pinPublishesIcons(pin)) return buildIconLibrary({ pin, registry: null, assets: new Map() });
  if (typeof assetsRoot !== "string" || !assetsRoot.trim()) {
    return unavailableLibrary(pin, "No pinned Forma icon directory was supplied.", [finding("registry.missing", "An explicit pinned dist/icons directory is required.")]);
  }
  const base = path.resolve(assetsRoot);
  const registryPath = path.join(base, "registry.json");
  if (!fs.existsSync(registryPath)) {
    return unavailableLibrary(pin, "The pinned Forma package has no icon registry.", [finding("registry.missing", `No registry.json in ${base}.`)]);
  }
  const registry = readJson(registryPath);
  const entries = Array.isArray(registry?.icons) ? registry.icons : [];
  // Only names that pass the identifier rule are ever joined to a path.
  const assets = new Map(entries
    .filter((entry) => typeof entry?.name === "string" && stableName.test(entry.name))
    .map((entry) => [entry.name, path.join(base, `${entry.name}.svg`)])
    .filter(([, file]) => fs.existsSync(file))
    .map(([name, file]) => [name, fs.readFileSync(file)]));
  return buildIconLibrary({ pin, registry, assets });
};

/**
 * Renders one icon reference from a verified library (pure). Never throws for
 * document data: unknown names, an icon-less pin and invalid options return an
 * inert `state` and no markup, so the surrounding words still carry meaning.
 */
export const renderIcon = (library, { name, label = null, size = "1em" }) => {
  if (typeof name !== "string" || !stableName.test(name)) return Object.freeze({ state: "invalid", html: "" });
  if (typeof size !== "string" || !safeSize.test(size)) return Object.freeze({ state: "invalid", html: "" });
  if (label !== null && (typeof label !== "string" || !label.trim() || label.length > 180)) return Object.freeze({ state: "invalid", html: "" });
  if (library.status !== "available") return Object.freeze({ state: "unavailable", html: "" });
  const icon = library.icons.get(name);
  if (!icon) return Object.freeze({ state: "unknown", html: "" });
  // Decorative by default: the adjacent printed words carry meaning (ICON-008/009).
  const semantics = label === null ? 'aria-hidden="true"' : `role="img" aria-label="${escapeHtml(label)}"`;
  const svg = icon.svg.replace("<svg ", '<svg aria-hidden="true" focusable="false" ');
  return Object.freeze({
    state: "rendered",
    html: `<span class="ef-print-icon" data-ef-icon="${name}" data-ef-icon-forma="${escapeHtml(library.formaVersion)}" style="--ef-print-icon-size:${size}" ${semantics}>${svg}</span>`
  });
};

// ---------------------------------------------------------------------------
// Strict build-script API, compatible with the Folio 0.4.0 release
// (`loadFormaIcons`, `renderFormaPrintIcon`, `renderFormaPrintIconGallery`):
// these throw instead of returning inert data, with the 0.4.0 error wording.
// ---------------------------------------------------------------------------

const fail = (reason) => {
  throw new Error(`Invalid Forma icon asset: ${reason}`);
};

const exactVersion = /^\d+\.\d+\.\d+$/;

const legacyReason = (library) => {
  const codes = library.findings.map((f) => f.code);
  const detail = library.findings.map((f) => `${f.code}: ${f.message}`).join(" ");
  if (codes.includes("registry.missing")) return `registry missing. ${detail}`;
  if (codes.includes("registry.version")) return `Forma version does not match the requested immutable release. ${detail}`;
  if (codes.includes("registry.entry")) return `invalid or duplicate icon identifier, or registry does not match Forma v1 artifact contract. ${detail}`;
  if (codes.includes("registry.digest")) return `missing trusted SVG digest. ${detail}`;
  if (codes.includes("icon.digest")) return `SVG digest differs from pinned registry. ${detail}`;
  if (codes.includes("icon.markup")) return `unsafe SVG features. ${detail}`;
  if (codes.includes("icon.grammar") || codes.includes("icon.missing") || codes.includes("icon.size")) return `unexpected SVG vocabulary. ${detail}`;
  if (library.findings.length) return `unsupported registry. ${detail}`;
  return library.reason;
};

const strictLibrary = (assetsRoot, expectedFormaVersion) => {
  if (typeof assetsRoot !== "string" || !assetsRoot.trim()) fail("explicit pinned asset directory required");
  const registry = readJson(path.join(path.resolve(assetsRoot), "registry.json"));
  if (!registry) fail("registry missing or unreadable");
  if (typeof registry.formaVersion !== "string" || !exactVersion.test(registry.formaVersion)) fail("registry is not stamped with an exact Forma release");
  if (expectedFormaVersion !== null && (typeof expectedFormaVersion !== "string" || !exactVersion.test(expectedFormaVersion))) fail("expectedFormaVersion must be an exact release");
  const version = expectedFormaVersion ?? registry.formaVersion;
  const library = loadIconLibrary({ pin: Object.freeze({ systemId: "forma", version }), assetsRoot });
  if (library.status !== "available") fail(legacyReason(library));
  return Object.freeze({ library, registry });
};

/**
 * Loads and fully verifies a release's icons (Folio 0.4.0 API). With no
 * `expectedFormaVersion` the registry's own stamped release is used, but every
 * SVG must still match its digest and the grammar.
 */
export function loadFormaIcons(assetsRoot, { expectedFormaVersion = null } = {}) {
  const { library, registry } = strictLibrary(assetsRoot, expectedFormaVersion);
  // The verified registry rows themselves, as 0.4.0 returned them.
  const icons = Object.freeze(registry.icons.map((row) => Object.freeze({ ...row })));
  return Object.freeze({ base: path.resolve(assetsRoot), icons, names: new Set(library.icons.keys()), formaVersion: library.formaVersion });
}

/** Strict single-icon API for build scripts: throws instead of returning inert data. */
export function renderFormaPrintIcon(name, { assetsRoot, label = null, size = "1em", expectedFormaVersion = null } = {}) {
  if (typeof name !== "string" || !stableName.test(name)) fail("invalid name");
  const { library } = strictLibrary(assetsRoot, expectedFormaVersion);
  if (!library.icons.has(name)) fail(`unknown icon '${name}'`);
  if (typeof size !== "string" || !safeSize.test(size)) fail("unsafe size");
  if (label !== null && (typeof label !== "string" || !label.trim() || label.length > 180)) fail("invalid accessible label");
  return renderIcon(library, { name, label, size }).html;
}

export function renderFormaPrintIconGallery(names, options) {
  if (!Array.isArray(names)) fail("gallery requires list of IDs");
  return names.map((name) => renderFormaPrintIcon(name, options)).join("\n");
}
