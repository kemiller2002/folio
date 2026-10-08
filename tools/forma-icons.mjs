// Folio consumes static, release-pinned Forma icon *artifacts*, never copied
// source paths or a second runtime icon implementation.
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";

const stableName = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const svgRoot = /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" class="ef-icon__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1\.8" stroke-linecap="round" stroke-linejoin="round">([\s\S]*)<\/svg>\s*$/;
const safeGeometry = /^(?:<(?:path d="[MmLlHhVvCcSsQqTtAaZzEe0-9\s.,+\-]+")\/>|<circle cx="[\d.]+" cy="[\d.]+" r="[\d.]+"\/>|<rect x="[\d.]+" y="[\d.]+" width="[\d.]+" height="[\d.]+"(?: rx="[\d.]+")?\/>)+$/;

const escapeAttribute = value => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const fail = reason => {throw new Error(`Invalid Forma icon asset: ${reason}`);};

export function loadFormaIcons(assetsRoot, {expectedFormaVersion = null} = {}) {
  if (typeof assetsRoot !== "string" || !assetsRoot.trim()) fail("explicit pinned asset directory required");
  const base = path.resolve(assetsRoot);
  const registryPath = path.join(base, "registry.json");
  // Deliberately never loads remote URLs and never guesses a mutable git branch.
  const source = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  if (source.schemaVersion !== 1 || source.grid !== 24 || !Array.isArray(source.icons)) fail("unsupported registry");
  if (typeof source.formaVersion !== "string" || !/^\d+\.\d+\.\d+$/.test(source.formaVersion)) fail("registry is not stamped with an exact Forma release");
  if (expectedFormaVersion !== null && source.formaVersion !== expectedFormaVersion) fail("Forma version does not match the requested immutable release");
  const names = new Set();
  for (const row of source.icons) {
    if (!row || typeof row.name !== "string" || !stableName.test(row.name) || names.has(row.name)) fail("invalid or duplicate icon identifier");
    if (row.svg !== `icons/${row.name}.svg` || row.html !== `icons/html/${row.name}.html` || row.origin !== "original") fail("registry does not match Forma v1 artifact contract");
    if (typeof row.svgSha256 !== "string" || !/^[a-f0-9]{64}$/.test(row.svgSha256)) fail("missing trusted SVG digest");
    names.add(row.name);
  }
  return {base, icons:Object.freeze([...source.icons]), names, formaVersion:source.formaVersion};
}

function checkedSvg(base, name, sha256) {
  const source = fs.readFileSync(path.join(base, name + ".svg"), "utf8");
  if (createHash("sha256").update(source).digest("hex") !== sha256) fail("SVG digest differs from pinned registry");
  if (source.length > 16000 || /[<>](?:script|image|iframe|foreignObject|style|use)\b|\bon[a-z]+\s*=|(?:javascript|data):/i.test(source)) fail("unsafe SVG features");
  const root = svgRoot.exec(source);
  if (!root || !safeGeometry.test(root[1])) fail("unexpected SVG vocabulary");
  return source.trim();
}

/** Compile static Folio markup from an immutable Forma assets directory. */
export function renderFormaPrintIcon(name, {assetsRoot, label = null, size = "1em", expectedFormaVersion = null} = {}) {
  if (typeof name !== "string" || !stableName.test(name)) fail("invalid name");
  const library = loadFormaIcons(assetsRoot, {expectedFormaVersion});
  if (!library.names.has(name)) fail(`unknown icon '${name}'`);
  if (typeof size !== "string" || !/^(?:\d+(?:\.\d+)?)(?:em|rem|px|pt)$/.test(size)) fail("unsafe size");
  if (label !== null && (typeof label !== "string" || !label.trim() || label.length > 180)) fail("invalid accessible label");
  const record = library.icons.find(icon => icon.name === name);
  const svg = checkedSvg(library.base, name, record.svgSha256);
  const semantics = label === null ? 'aria-hidden="true"' : `role="img" aria-label="${escapeAttribute(label)}"`;
  return `<span class="ef-print-icon" data-ef-icon="${name}" style="--ef-print-icon-size:${size}" ${semantics}>${svg}</span>`;
}

export function renderFormaPrintIconGallery(names, options) {
  if (!Array.isArray(names)) fail("gallery requires list of IDs");
  return names.map(name=>renderFormaPrintIcon(name,options)).join("\n");
}
