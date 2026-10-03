import fs from "node:fs";
import path from "node:path";
import { elementNames } from "../src/components/register.js";
import { machineComponentMetadata } from "./machine-component-metadata.mjs";

const root = process.cwd();
const site = path.join(root, "site-dist");
const args = new Set(process.argv.slice(2));
const write = args.has("--write");
const check = args.has("--check");

if (!fs.existsSync(path.join(site, "site-manifest.json"))) {
  console.error("site-dist is missing. Run npm run site:build before the machine-operability audit.");
  process.exit(2);
}

const manifest = JSON.parse(fs.readFileSync(path.join(site, "site-manifest.json"), "utf8"));
const unsafe = [
  [/<script\b/i, "embedded script"],
  [/\son[a-z]+\s*=/i, "inline event handler"],
  [/<canvas\b/i, "opaque canvas"],
  [/\bdraggable=["']true["']/i, "drag-only surface"]
];

const inspectHtml = html => unsafe.filter(([pattern]) => pattern.test(html)).map(([, label]) => label);
const read = (...parts) => fs.readFileSync(path.join(site, ...parts), "utf8");

const components = elementNames.map(tag => {
  const siteEntry = manifest.components.find(component => component.element === tag);
  const machine = machineComponentMetadata[tag];
  const reasons = [];
  if (!machine) reasons.push("machine metadata missing");
  if (!siteEntry) reasons.push("documentation catalog entry missing");

  if (siteEntry) {
    for (let index = 1; index <= 3; index += 1) {
      const file = path.join(site, "demos", siteEntry.slug, `${index}.html`);
      if (!fs.existsSync(file)) {
        reasons.push(`example ${index} missing`);
        continue;
      }
      const html = fs.readFileSync(file, "utf8");
      if (!new RegExp(`<${tag}\\b`, "i").test(html)) reasons.push(`example ${index} does not exercise ${tag}`);
      reasons.push(...inspectHtml(html).map(label => `example ${index}: forbidden public path: ${label}`));
    }
  }

  return {
    tag,
    slug: siteEntry?.slug ?? tag.replace(/^ef-print-/, ""),
    title: siteEntry?.title ?? tag,
    category: siteEntry?.category ?? "unknown",
    ...machine,
    status: reasons.length ? "needs-retrofit" : "pass",
    reasons: [...new Set(reasons)]
  };
});

const recipes = manifest.recipes.map(recipe => {
  const reasons = [];
  for (let index = 1; index <= 3; index += 1) {
    const file = path.join(site, "demos", recipe.demoSlug, `${index}.html`);
    if (!fs.existsSync(file)) {
      reasons.push(`example ${index} missing`);
      continue;
    }
    const html = fs.readFileSync(file, "utf8");
    reasons.push(...inspectHtml(html).map(label => `example ${index}: forbidden public path: ${label}`));
    if (!/<(?:main|article|section|header|footer|nav|table|figure|h[1-6]|p|ul|ol|dl)\b/i.test(html)) {
      reasons.push(`example ${index} has no detected native semantic content`);
    }
  }
  return {
    slug: recipe.slug,
    selector: recipe.selector,
    status: reasons.length ? "needs-retrofit" : "pass",
    reasons: [...new Set(reasons)]
  };
});

const summary = {
  registeredElements: components.length,
  componentPass: components.filter(item => item.status === "pass").length,
  componentNeedsRetrofit: components.filter(item => item.status === "needs-retrofit").length,
  recipes: recipes.length,
  recipePass: recipes.filter(item => item.status === "pass").length,
  recipeNeedsRetrofit: recipes.filter(item => item.status === "needs-retrofit").length
};

const report = {
  contract: "folio-machine-operability",
  contractVersion: "1.0.0",
  summary,
  components,
  recipes
};
const json = JSON.stringify(report, null, 2) + "\n";

const componentRow = item => `| \`${item.tag}\` | ${item.title} | ${item.category} | ${item.reasons.join("; ") || "passive light-DOM element; three semantic demos"} |`;
const recipeRow = item => `| \`${item.slug}\` | \`${item.selector}\` | ${item.reasons.join("; ") || "three semantic, script-free demos"} |`;
const badComponents = components.filter(item => item.status === "needs-retrofit");
const badRecipes = recipes.filter(item => item.status === "needs-retrofit");

const markdown = [
  "# Folio Machine-Operability Retrofit Audit",
  "",
  "This file is generated from the built Folio documentation catalog by `tools/machine-operability-audit.mjs`. It covers every registered print primitive and every published recipe.",
  "",
  `**Registered elements:** ${summary.registeredElements}  `,
  `**Component pass:** ${summary.componentPass}  `,
  `**Component needs retrofit:** ${summary.componentNeedsRetrofit}  `,
  `**Recipes:** ${summary.recipes}  `,
  `**Recipe pass:** ${summary.recipePass}  `,
  `**Recipe needs retrofit:** ${summary.recipeNeedsRetrofit}`,
  "",
  "The cross-browser machine suite separately proves stable native identity, light-DOM preservation, and semantic descendant visibility for every registered element after custom-element upgrade.",
  "",
  `## Component retrofit findings (${badComponents.length})`,
  "",
  "| Element | Name | Category | Finding |",
  "| --- | --- | --- | --- |",
  ...(badComponents.length ? badComponents.map(componentRow) : ["| _None_ | | | |"]),
  "",
  "## All components",
  "",
  "| Element | Name | Category | Evidence |",
  "| --- | --- | --- | --- |",
  ...components.map(componentRow),
  "",
  `## Recipe retrofit findings (${badRecipes.length})`,
  "",
  "| Recipe | Selector | Finding |",
  "| --- | --- | --- |",
  ...(badRecipes.length ? badRecipes.map(recipeRow) : ["| _None_ | | |"]),
  "",
  "## All recipes",
  "",
  "| Recipe | Selector | Evidence |",
  "| --- | --- | --- |",
  ...recipes.map(recipeRow),
  ""
].join("\n");

const jsonPath = path.join(root, "contracts", "machine-operability-catalog.json");
const mdPath = path.join(root, "docs", "MACHINE-OPERABILITY-AUDIT.md");
const compare = (file, expected) => fs.existsSync(file) && fs.readFileSync(file, "utf8") === expected;

if (write) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, json);
  fs.writeFileSync(mdPath, markdown + "\n");
}
if (check) {
  const stale = [];
  if (!compare(jsonPath, json)) stale.push(path.relative(root, jsonPath));
  if (!compare(mdPath, markdown + "\n")) stale.push(path.relative(root, mdPath));
  if (stale.length) {
    console.error(`Machine-operability audit is stale: ${stale.join(", ")}. Run npm run machine:audit.`);
    process.exitCode = 1;
  }
}
console.log(JSON.stringify(summary));
