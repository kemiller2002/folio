// GH-54: Folio universal UI layout/interaction conformance runner.
//
// Standard: kemiller2002/visual-engineering framework/standards/UI-LAYOUT-INTERACTION.md
// (version pinned in tests/conformance/uli.mjs). Folio adopts ULI-L12 for print
// and paged media and ULI-A01..A10 plus ULI-L05/L06/L09 for its documentation
// site and interactive print previews.
//
// Print evidence is collected in two separate legs per surface:
//   (a) browser print preview: page.emulateMedia({ media: "print" }) with the
//       viewport set to the intended page content box;
//   (b) Chromium PDF output: page.pdf({ preferCSSPageSize: true }) at the
//       intended page size, extracted with Poppler (pdfinfo/pdftotext).
//
// Usage: node tests/run-ui-conformance.mjs [--scope=all|print|site] [--only=TEXT]
// Environment: FOLIO_ENGINES (site layout engines; default chromium),
//              FOLIO_CHROMIUM_EXECUTABLE (optional Chromium binary override).
// Requires site-dist (npm run site:build) for the site and preview surfaces.

import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { chromium, firefox, webkit } from "playwright";
import { STATUS, ULI_STANDARD, applyExceptions, finding, summarize, summarizeByRule, validateExceptions } from "./conformance/uli.mjs";
import {
  checkClippingContainers,
  checkHeadersFooters,
  checkKeepWithNext,
  checkNumericIntegrity,
  checkOwnBoxSpill,
  checkPageBoxContainment,
  checkPdfPages,
  checkPdfScale,
  checkPdfTextCompleteness,
  checkPdfWordPlacement,
  checkRunningContent,
  checkTableHeaderRepeat,
} from "./conformance/print-rules.mjs";
import {
  VIEWPORT_WIDTHS,
  checkControlSemantics,
  checkDisclosureOutcome,
  checkKeyboardReach,
  checkLinkOutcome,
  checkNavLabels,
  checkPageOverflow,
  checkPreviewFrame,
  checkSkipLink,
  controlKind,
} from "./conformance/site-rules.mjs";
import { collectPrintSurface } from "./conformance/collect-print.mjs";
import { exerciseDisclosure, inventoryControls, measureResponsive, tabWalk } from "./conformance/collect-site.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const siteRoot = resolve(root, "site-dist");
const outputDir = resolve(root, "test-results/ui-conformance");
const scope = (process.argv.find(arg => arg.startsWith("--scope="))?.split("=")[1] ?? "all").trim();
assert.ok(["all", "print", "site"].includes(scope), `Unknown --scope=${scope}`);
// --only=TEXT narrows print surfaces to ids containing TEXT (local diagnosis only).
const only = process.argv.find(arg => arg.startsWith("--only="))?.split("=")[1] ?? "";

const engineTypes = { chromium, firefox, webkit };
const siteEngines = (process.env.FOLIO_ENGINES ?? "chromium").split(",").map(name => name.trim()).filter(Boolean);
assert.ok(siteEngines.every(name => name in engineTypes), `Unknown engine in FOLIO_ENGINES: ${siteEngines.join(", ")}`);
const launchOptions = name => (name === "chromium" && process.env.FOLIO_CHROMIUM_EXECUTABLE ? { executablePath: process.env.FOLIO_CHROMIUM_EXECUTABLE } : {});

const exceptions = JSON.parse(readFileSync(resolve(root, "tests/conformance/exceptions.json"), "utf8"));
const exceptionProblems = validateExceptions(exceptions);
assert.deepEqual(exceptionProblems, [], `Invalid exceptions file: ${exceptionProblems.join("; ")}`);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

/** Static server: repository root at /repo/, the built site at /. */
async function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      let pathname = decodeURIComponent(url.pathname);
      const base = pathname.startsWith("/repo/") ? root : siteRoot;
      if (pathname.startsWith("/repo/")) pathname = pathname.slice("/repo".length);
      let filePath = resolve(base, `.${pathname}`);
      if (filePath !== base && !filePath.startsWith(base + sep)) throw new Error("outside root");
      if ((await stat(filePath)).isDirectory()) filePath = join(filePath, "index.html");
      const body = await readFile(filePath);
      response.writeHead(200, { "content-type": mime[extname(filePath)] ?? "application/octet-stream" });
      response.end(body);
    } catch {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("Not found");
    }
  });
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

const walk = directory => readdirSync(directory).flatMap(name => {
  const path = join(directory, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});

function printSurfaces() {
  const fixtures = walk(resolve(root, "tests/fixtures"))
    .filter(path => path.endsWith(".html"))
    .map(path => ({ id: `fixture:${relative(resolve(root, "tests/fixtures"), path)}`, url: `/repo/${relative(root, path).split(sep).join("/")}` }));
  const site = existsSync(siteRoot)
    ? walk(siteRoot)
        .filter(path => path.endsWith(".html") && (path.includes(`${sep}demos${sep}`) || path.endsWith(`${sep}preview.html`)))
        .map(path => ({ id: `site:${relative(siteRoot, path).split(sep).join("/")}`, url: `/${relative(siteRoot, path).split(sep).join("/")}` }))
    : [];
  return [...fixtures, ...site].filter(item => item.id.includes(only)).sort((a, b) => a.id.localeCompare(b.id));
}

function sitePages() {
  if (!existsSync(siteRoot)) return { docs: [], previews: [] };
  const all = walk(siteRoot).filter(path => path.endsWith(".html")).map(path => `/${relative(siteRoot, path).split(sep).join("/")}`.replace(/index\.html$/, "")).sort();
  return {
    docs: all.filter(route => !route.startsWith("/demos/") && !route.endsWith("preview.html")),
    previews: all.filter(route => route.startsWith("/demos/") || route.endsWith("preview.html")),
  };
}

async function pool(items, size, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }));
  return results;
}

// ---------------------------------------------------------------------------
// Print and PDF (ULI-L12)
// ---------------------------------------------------------------------------

async function runPrint(browser, baseUrl) {
  const surfaces = printSurfaces();
  const pdfDir = resolve(outputDir, "pdf");
  await mkdir(pdfDir, { recursive: true });
  const perSurface = await pool(surfaces, 4, async surface => {
    const state = `chromium ${browser.version()}; print media; viewport=page content box`;
    const pdfState = `chromium ${browser.version()}; page.pdf preferCSSPageSize`;
    const pdfPath = resolve(pdfDir, `${surface.id.replace(/[^\w.-]+/g, "_")}.pdf`);
    try {
      const evidence = await collectPrintSurface(browser, { url: baseUrl + surface.url, pdfPath });
      if (evidence.httpStatus !== 200) throw new Error(`HTTP ${evidence.httpStatus}`);
      const sizeState = `${state}; page=${evidence.pageBox?.sizeText ?? "unresolved"} margin=${evidence.pageBox?.marginText ?? "unresolved"}`;
      const findings = [
        ...checkPageBoxContainment({ surface: surface.id, state: sizeState, layout: evidence.layout }),
        ...checkOwnBoxSpill({ surface: surface.id, state: sizeState, layout: evidence.layout }),
        ...checkClippingContainers({ surface: surface.id, state: sizeState, layout: evidence.layout }),
        ...checkHeadersFooters({ surface: surface.id, state: sizeState, layout: evidence.layout }),
        ...checkNumericIntegrity({ surface: surface.id, state: sizeState, layout: evidence.layout }),
        ...checkPdfPages({ surface: surface.id, state: pdfState, pdf: evidence.pdf, pageBoxes: evidence.pageBoxes, estimatedPages: evidence.estimatedPages }),
        ...checkPdfWordPlacement({ surface: surface.id, state: pdfState, pdf: evidence.pdf, pageBox: evidence.pageBox, marginBoxesDeclared: evidence.contract.marginBoxes || evidence.pageBoxes.length > 1 }),
        ...checkPdfScale({ surface: surface.id, state: pdfState, reference: evidence.layout.reference, pdf: evidence.pdf }),
        ...checkPdfTextCompleteness({ surface: surface.id, state: pdfState, domText: evidence.layout.domText, pdfText: evidence.pdf.text, readingText: evidence.pdf.readingText }),
        ...checkTableHeaderRepeat({ surface: surface.id, state: pdfState, tables: evidence.layout.tables, pageFlats: evidence.pageFlats }),
        ...checkKeepWithNext({ surface: surface.id, state: pdfState, keeps: evidence.layout.keeps, pageFlats: evidence.pageFlats }),
        ...checkRunningContent({ surface: surface.id, state: pdfState, runningText: evidence.contract.runningText, marginBoxesDeclared: evidence.contract.marginBoxes, pageFlats: evidence.pageFlats }),
      ];
      return { surface: surface.id, pages: evidence.pdf.pages.length, pageSize: evidence.pageBox?.sizeText ?? null, findings };
    } catch (error) {
      return { surface: surface.id, pages: null, findings: [finding({ rule: "ULI-L12/collection", status: STATUS.UNKNOWN, location: surface.id, state, evidence: `Evidence collection failed: ${error.message}` })] };
    }
  });
  return {
    inventory: {
      surfaces: surfaces.length,
      fixtures: surfaces.filter(item => item.id.startsWith("fixture:")).length,
      siteDemos: surfaces.filter(item => item.id.startsWith("site:demos/")).length,
      sitePreviews: surfaces.filter(item => item.id.endsWith("preview.html")).length,
      notApplicableFamilies: ["menus", "business cards"],
    },
    surfaces: perSurface.map(({ surface, pages, pageSize, findings }) => ({ surface, pages, pageSize, summary: summarize(findings) })),
    findings: [
      ...perSurface.flatMap(item => item.findings),
      ...["menus", "business cards"].map(family => finding({
        rule: "ULI-L12/surface-family",
        status: STATUS.NOT_APPLICABLE,
        location: `family:${family}`,
        state: "repository inventory",
        evidence: `Folio ships no ${family} fixture, recipe or documented example; nothing to verify.`,
      })),
    ],
  };
}

// ---------------------------------------------------------------------------
// Documentation site and interactive previews (ULI-A01..A10, L05, L06, L09)
// ---------------------------------------------------------------------------

async function resolveDestination(request, absoluteHref, cache) {
  const url = new URL(absoluteHref);
  const fragment = decodeURIComponent(url.hash.replace(/^#/, ""));
  url.hash = "";
  if (!cache.has(url.href)) {
    const response = await request.get(url.href);
    const body = response.ok() ? await response.text() : "";
    cache.set(url.href, { status: response.status(), body });
  }
  const { status, body } = cache.get(url.href);
  const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return {
    url: absoluteHref,
    status,
    fragment: fragment || null,
    hasFragmentTarget: fragment ? new RegExp(`\\s(?:id|name)=["']${escaped}["']`).test(body) : undefined,
    title: (body.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "").trim(),
    h1: /<h1\b/i.test(body),
    textLength: body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length,
  };
}

async function runSite(baseUrl) {
  const { docs, previews } = sitePages();
  if (!docs.length) {
    return { inventory: { pages: 0 }, findings: [finding({ rule: "ULI-A10/site", status: STATUS.UNKNOWN, location: "site-dist", state: "not built", evidence: "site-dist is missing; run npm run site:build." })] };
  }
  const findings = [];
  const inventory = { documentationPages: docs.length, previewPages: previews.length, controls: 0, byKind: {}, uniqueDestinations: 0, exercised: { clickedLinks: 0, popups: 0, disclosures: 0, tabWalks: 0, frames: 0 } };
  const browser = await chromium.launch(launchOptions("chromium"));
  const destinationCache = new Map();
  try {
    const state = `chromium ${browser.version()}; screen; 1280x900`;
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const request = context.request;

    for (const route of [...docs, ...previews]) {
      const pageId = `site:${route}`;
      await page.goto(baseUrl + route, { waitUntil: "load" });
      const controls = await page.evaluate(inventoryControls);
      inventory.controls += controls.length;
      for (const control of controls) {
        const kind = controlKind(control);
        inventory.byKind[kind] = (inventory.byKind[kind] ?? 0) + 1;
        findings.push(...checkControlSemantics({ page: pageId, state, control }));
        if (["internal-link", "fragment-link", "external-link", "protocol-link"].includes(kind)) {
          const resolution = kind === "external-link" || kind === "protocol-link" ? null : await resolveDestination(request, control.absoluteHref, destinationCache);
          findings.push(checkLinkOutcome({ page: pageId, state, control, resolution }));
        }
      }

      const isDoc = docs.includes(route);
      if (!isDoc) continue;

      // Embedded previews: each frame must load a named document with content.
      for (const control of controls.filter(item => item.tag === "iframe")) {
        const frameIndex = controls.filter(item => item.tag === "iframe").indexOf(control);
        const handle = await page.locator("iframe").nth(frameIndex).elementHandle();
        const frame = await handle.contentFrame();
        await frame.waitForLoadState("load");
        const observation = { url: frame.url(), loaded: frame.url() !== "about:blank", textLength: await frame.evaluate(() => document.body?.innerText.trim().length ?? 0) };
        inventory.exercised.frames += 1;
        findings.push(checkPreviewFrame({ page: pageId, state, control, observation }));
      }

      // Disclosures ("View HTML"): pointer, Enter, Space, reset.
      const summaries = await page.locator("details > summary").count();
      for (let index = 0; index < summaries; index += 1) {
        const control = controls.filter(item => item.tag === "summary")[index] ?? { path: `details > summary:nth(${index})` };
        const observation = await exerciseDisclosure(page, index);
        inventory.exercised.disclosures += 1;
        findings.push(...checkDisclosureOutcome({ page: pageId, state, control, observation }));
      }

      // Every "Open standalone print preview" example action opens its document.
      const standalone = page.locator(".example-actions a[target=_blank]");
      for (let index = 0; index < await standalone.count(); index += 1) {
        const link = standalone.nth(index);
        const href = await link.evaluate(element => element.href);
        const [popup] = await Promise.all([context.waitForEvent("page"), link.click()]);
        await popup.waitForLoadState("load");
        const ok = popup.url() === href && await popup.evaluate(() => document.body.innerText.trim().length > 0 && Boolean(document.querySelector("[class^='folio'], ef-print-document, ef-print-table, ef-print-columns, body > *")));
        inventory.exercised.popups += 1;
        findings.push(finding({ rule: "ULI-A10/example-action", status: ok ? STATUS.PASS : STATUS.FAIL, location: `${pageId} .example-actions a:nth(${index})`, state, evidence: ok ? `Opens ${popup.url()} in a new browsing context with document content.` : `Popup ${popup.url()} did not show the expected document (${href}).` }));
        await popup.close();
      }

      // Click-through of same-page fragment links and the primary navigation.
      for (const control of controls.filter(item => controlKind(item) === "fragment-link")) {
        const locator = page.locator(`a[href="${control.href}"]`).first();
        if (!(await locator.isVisible())) await locator.focus();
        await locator.press("Enter");
        const hash = await page.evaluate(() => location.hash);
        inventory.exercised.clickedLinks += 1;
        findings.push(finding({ rule: "ULI-A10/fragment-action", status: hash === control.href ? STATUS.PASS : STATUS.FAIL, location: `${pageId} ${control.path}`, state, evidence: `Keyboard activation set location.hash to "${hash}" (expected ${control.href}).` }));
      }

      // Keyboard: skip link first, then sequential reach of every control.
      await page.goto(baseUrl + route, { waitUntil: "load" });
      await page.keyboard.press("Tab");
      const firstTab = await page.evaluate(() => ({ isSkip: document.activeElement?.classList.contains("skip-link") ?? false, visible: (document.activeElement?.getBoundingClientRect().height ?? 0) > 0 }));
      let skip = null;
      if (firstTab.isSkip) {
        await page.keyboard.press("Enter");
        skip = await page.evaluate(() => ({ hash: location.hash, targetExists: Boolean(document.querySelector("#main")) }));
        skip.firstTabIsSkip = firstTab.isSkip && firstTab.visible;
      } else if (controls.some(item => item.visuallyHiddenUntilFocus)) {
        skip = { hash: "", targetExists: false, firstTabIsSkip: false };
      }
      findings.push(checkSkipLink({ page: pageId, state, observation: skip }));
      await page.goto(baseUrl + route, { waitUntil: "load" });
      const keyboardControls = controls.filter(item => !["iframe"].includes(item.tag) && !(item.tabindex !== null && Number(item.tabindex) < 0)).map(item => item.path);
      const reached = await tabWalk(page, keyboardControls.length + 600);
      inventory.exercised.tabWalks += 1;
      findings.push(checkKeyboardReach({ page: pageId, state, expected: keyboardControls, reached }));
    }
    inventory.uniqueDestinations = destinationCache.size;

    // Primary navigation click-through at desktop and phone widths: real navigation outcome.
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(baseUrl + "/", { waitUntil: "load" });
      const count = await page.locator(".site-nav a").count();
      for (let index = 0; index < count; index += 1) {
        await page.goto(baseUrl + "/", { waitUntil: "load" });
        const link = page.locator(".site-nav a").nth(index);
        const [label, href] = await Promise.all([link.innerText(), link.evaluate(element => element.href)]);
        await Promise.all([page.waitForURL(href), link.click()]);
        const h1 = (await page.locator("h1").first().innerText()).trim();
        inventory.exercised.clickedLinks += 1;
        findings.push(finding({ rule: "ULI-A10/navigation", status: page.url() === href && h1 ? STATUS.PASS : STATUS.FAIL, location: `site:/ .site-nav a "${label.trim()}"`, state: `chromium; screen; ${width}px`, evidence: `Click navigated to ${page.url()} with heading "${h1.slice(0, 60)}".` }));
      }
    }
    await context.close();
  } finally {
    await browser.close();
  }

  // Responsive layout at the ULI-L09 widths in each selected engine.
  for (const engineName of siteEngines) {
    const engine = await engineTypes[engineName].launch(launchOptions(engineName));
    try {
      const context = await engine.newContext();
      const page = await context.newPage();
      for (const width of VIEWPORT_WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        const state = `${engineName} ${engine.version()}; screen; ${width}px`;
        for (const route of [...docs, ...previews]) {
          await page.goto(baseUrl + route, { waitUntil: "load" });
          const metrics = await page.evaluate(measureResponsive);
          findings.push(checkPageOverflow({ page: `site:${route}`, state, metrics }));
          if (docs.includes(route)) findings.push(...checkNavLabels({ page: `site:${route}`, state, navs: metrics.navs, viewportWidth: width }));
        }
      }
      await context.close();
    } finally {
      await engine.close();
    }
  }
  return { inventory, findings };
}

// ---------------------------------------------------------------------------

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
const { server, baseUrl } = await startServer();
const startedAt = new Date().toISOString();
let print = null;
let site = null;
try {
  if (scope === "all" || scope === "print") {
    const browser = await chromium.launch(launchOptions("chromium"));
    try {
      print = await runPrint(browser, baseUrl);
    } finally {
      await browser.close();
    }
  }
  if (scope === "all" || scope === "site") site = await runSite(baseUrl);
} finally {
  await new Promise(resolvePromise => server.close(resolvePromise));
}

const allFindings = applyExceptions([...(print?.findings ?? []), ...(site?.findings ?? [])], exceptions);
const failures = allFindings.filter(item => item.status === STATUS.FAIL);
const report = {
  standard: ULI_STANDARD,
  startedAt,
  finishedAt: new Date().toISOString(),
  scope,
  siteEngines,
  summary: summarize(allFindings),
  byRule: summarizeByRule(allFindings),
  print: print ? { inventory: print.inventory, surfaces: print.surfaces, summary: summarize(applyExceptions(print.findings, exceptions)) } : null,
  site: site ? { inventory: site.inventory, summary: summarize(applyExceptions(site.findings, exceptions)) } : null,
  exceptions,
  failures,
  unknowns: allFindings.filter(item => item.status === STATUS.UNKNOWN),
  findings: allFindings,
};
await writeFile(resolve(outputDir, "results.json"), `${JSON.stringify(report, null, 2)}\n`);

console.log(`ULI conformance (${ULI_STANDARD.path} v${ULI_STANDARD.version}), scope=${scope}`);
if (print) console.log(`print: ${print.inventory.surfaces} surfaces -> ${JSON.stringify(report.print.summary)}`);
if (site) console.log(`site: ${site.inventory.documentationPages ?? 0} documentation + ${site.inventory.previewPages ?? 0} preview pages, ${site.inventory.controls ?? 0} controls -> ${JSON.stringify(report.site.summary)}`);
console.log(`by rule: ${JSON.stringify(report.byRule)}`);
for (const item of failures.slice(0, 40)) console.log(`FAIL ${item.rule} @ ${item.location} [${item.state}] ${item.evidence}`);
if (failures.length > 40) console.log(`... ${failures.length - 40} more failures in test-results/ui-conformance/results.json`);
console.log(`Evidence: ${relative(root, resolve(outputDir, "results.json"))}`);
process.exitCode = failures.length ? 1 : 0;
