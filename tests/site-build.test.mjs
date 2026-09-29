import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const site = path.join(root, "site-dist");

async function registeredElements() {
  const source = await fs.readFile(path.join(root, "src/components/register.js"), "utf8");
  return [...new Set([...source.matchAll(/"(ef-print-[a-z-]+)"/g)].map(match => match[1]))];
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(target));
    else files.push(target);
  }
  return files;
}

test("Folio site has one component page and three examples for every registered element", async () => {
  const registered = await registeredElements();
  const manifest = JSON.parse(await fs.readFile(path.join(site, "site-manifest.json"), "utf8"));

  assert.equal(manifest.componentCount, registered.length);
  assert.deepEqual([...manifest.registeredElements].sort(), [...registered].sort());
  assert.equal(manifest.exampleCount, registered.length * 3);

  for (const component of manifest.components) {
    const page = await fs.readFile(path.join(site, "components", component.slug, "index.html"), "utf8");
    assert.equal((page.match(/data-example/g) ?? []).length, 3, component.slug);
    assert.match(page, new RegExp(component.element.replaceAll("-", "\\-")));

    for (let index = 1; index <= 3; index += 1) {
      await fs.access(path.join(site, "demos", component.slug, `${index}.html`));
    }
  }
});

test("Folio site publishes the canonical Signal results report", async () => {
  const page = await fs.readFile(path.join(site, "reports", "signal-results", "index.html"), "utf8");
  const preview = await fs.readFile(path.join(site, "reports", "signal-results", "preview.html"), "utf8");
  const manifest = JSON.parse(await fs.readFile(path.join(site, "site-manifest.json"), "utf8"));

  assert.match(page, /Signal results report/);
  assert.match(page, /Signal Results Print Profile 1\.0/);
  assert.match(preview, /SIGNAL-INTEGRITY/);
  assert.match(preview, /<ef-print-metric/);
  assert.match(preview, /<ef-print-integrity/);
  assert.match(preview, /<ef-print-finding/);
  assert.match(preview, /Textual equivalent of the delivery profile radar/);
  assert.doesNotMatch(preview, /<script\b/i);
  assert.deepEqual(manifest.reportExamples, ["signal-results"]);
  await fs.access(path.join(site, "assets", "signal-results.css"));
});

test("Folio site publishes every recipe with three standalone examples", async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(site, "site-manifest.json"), "utf8"));
  const printCss = await fs.readFile(path.join(site, "assets", "folio-print.css"), "utf8");

  assert.ok(manifest.recipeCount >= 8);
  assert.equal(manifest.recipeExampleCount, manifest.recipeCount * 3);
  for (const recipe of manifest.recipes) {
    const page = await fs.readFile(path.join(site, "recipes", recipe.slug, "index.html"), "utf8");
    assert.equal((page.match(/data-example/g) ?? []).length, 3, recipe.slug);
    assert.ok(page.includes(recipe.selector), `${recipe.slug} names its selector`);
    assert.ok(new RegExp(`\\${recipe.selector}[\\s>{\\[]`).test(printCss), `${recipe.selector} exists in the public stylesheet`);
    for (let index = 1; index <= 3; index += 1) {
      await fs.access(path.join(site, "demos", recipe.demoSlug, `${index}.html`));
    }
  }
  assert.match(printCss, /@layer ef-print-foundation, ef-print-components, ef-print-recipes;/);
});

test("Folio site publishes the resume and professional-profile family", async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(site, "site-manifest.json"), "utf8"));
  const family = await fs.readFile(path.join(site, "profiles", "index.html"), "utf8");

  assert.deepEqual(manifest.profileExamples.map(item => item.id), ["RESUME-01", "RESUME-02", "PROFILE-03"]);
  assert.match(family, /Resume and professional profile/);
  assert.match(family, /DF-PRINT-2026-0004/);
  assert.doesNotMatch(family, /<ef-print-resume|<ef-print-job|<ef-print-education/);
  for (const item of manifest.profileExamples) {
    const page = await fs.readFile(path.join(site, "profiles", item.slug, "index.html"), "utf8");
    const preview = await fs.readFile(path.join(site, "profiles", item.slug, "preview.html"), "utf8");
    for (const label of ["Folio primitives and recipes used", "Renderer limitations", "Mobile preview behavior", "View semantic source", "Capability", "Page"]) {
      assert.ok(page.includes(label), `${item.id} page shows ${label}`);
    }
    assert.match(preview, new RegExp(`data-fixture="${item.id}"`));
    assert.match(preview, /class="ef-row"/);
    assert.match(preview, /\.\.\/\.\.\/assets\/folio-print\.css/);
    assert.doesNotMatch(preview, /src\/styles|<script\b/i);
  }
});

test("generated Folio documentation contains no browser scripts", async () => {
  const files = await walk(site);
  for (const file of files.filter(file => file.endsWith(".html"))) {
    const html = await fs.readFile(file, "utf8");
    assert.doesNotMatch(html, /<script\b/i, path.relative(site, file));
    assert.doesNotMatch(html, /\bon[a-z]+\s*=/i, path.relative(site, file));
  }
});

test("Folio site publishes capability and agent guidance surfaces", async () => {
  const home = await fs.readFile(path.join(site, "index.html"), "utf8");
  const capabilities = await fs.readFile(path.join(site, "capabilities", "index.html"), "utf8");
  const agents = await fs.readFile(path.join(site, "agents", "index.html"), "utf8");

  assert.match(home, /Folio/);
  assert.match(home, /Only shipped primitives get pages/);
  assert.match(capabilities, /P0/);
  assert.match(capabilities, /P3/);
  assert.match(capabilities, /provisional/i);
  assert.match(agents, /not a pagination engine/i);
  assert.match(agents, /Mobile and screen preview behavior/i);
  assert.match(agents, /ef-print-columns/);
  assert.match(agents, /ef-print-sidebar/);
  assert.match(agents, /docs\/AGENT-USAGE\.md/);
});

test("site artifact contains actual Folio print CSS and Pages marker", async () => {
  await fs.access(path.join(site, ".nojekyll"));
  const printCss = await fs.readFile(path.join(site, "assets", "folio-print.css"), "utf8");
  assert.match(printCss, /ef-print-columns/);
  assert.match(printCss, /ef-print-sidebar/);
  await fs.access(path.join(site, "assets", "site.css"));
  await fs.access(path.join(site, "assets", "demo.css"));
});


test("Folio site publishes the mobile documentation contract", async () => {
  const home = await fs.readFile(path.join(site, "index.html"), "utf8");
  const component = await fs.readFile(path.join(site, "components", "columns", "index.html"), "utf8");
  const capabilities = await fs.readFile(path.join(site, "capabilities", "index.html"), "utf8");
  const agents = await fs.readFile(path.join(site, "agents", "index.html"), "utf8");
  const siteCss = await fs.readFile(path.join(site, "assets", "site.css"), "utf8");
  const demoCss = await fs.readFile(path.join(site, "assets", "demo.css"), "utf8");
  const printCss = await fs.readFile(path.join(site, "assets", "folio-print.css"), "utf8");

  for (const [name, html] of [["home", home], ["component", component], ["capabilities", capabilities], ["agents", agents]]) {
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/, name);
  }

  assert.match(component, /class="preview-note"/);
  assert.match(component, /screen-only inspection layout/i);
  assert.match(capabilities, /class="table-scroll"/);
  assert.match(agents, /class="table-scroll"/);
  assert.match(siteCss, /@media \(max-width: 680px\)/);
  assert.match(siteCss, /@media \(max-width: 360px\)/);
  assert.match(siteCss, /instruction-grid/);
  assert.match(printCss, /@media screen and \(max-width: 48rem\)/);
  assert.match(printCss, /ef-print-columns\s*\{[\s\S]*?column-count:\s*1;/);
  assert.match(printCss, /ef-print-sidebar\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\);/);
  assert.doesNotMatch(demoCss, /ef-print-columns\s*\{\s*column-count:\s*1;/);
  assert.match(demoCss, /@media print/);
});
