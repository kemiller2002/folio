// Professional-profile fixture tests (FOLIO-RES-090..099).
//
// RESUME-01 and RESUME-02 reproduce kemiller2002/resume (index.html and
// developer.html at ba786e4); PROFILE-03 is a generalized profile built from the
// same recipes. Assertions are geometric, semantic, and textual rather than
// pixel comparisons.
//
// Deterministic PDF evidence uses Chromium. Screen/print-media style checks run
// in every engine listed in FOLIO_ENGINES (default: chromium,firefox,webkit).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { chromium, firefox, webkit } from "playwright";

const root = resolve(new URL("..", import.meta.url).pathname);
const outputDir = resolve(root, "test-results/profile-fixtures");
const profileDir = "tests/fixtures/profiles";
const manifest = JSON.parse(await readFile(resolve(root, profileDir, "reference/manifest.json"), "utf8"));

const engines = {chromium, firefox, webkit};
const selectedEngines = (process.env.FOLIO_ENGINES ?? "chromium,firefox,webkit").split(",").map(name => name.trim()).filter(Boolean);
assert.ok(selectedEngines.every(name => name in engines), `Unknown engine in FOLIO_ENGINES: ${selectedEngines.join(", ")}`);

const MM = 72 / 25.4;
const A4 = {width: 595.28, height: 841.89};
const LETTER = {width: 612, height: 792};

const fixtures = [
  {id: "RESUME-01", file: "resume-01.html", reference: "index", page: A4, marginMm: 10, identityColumns: 2},
  {id: "RESUME-02", file: "resume-02.html", reference: "developer", page: A4, marginMm: 10, identityColumns: 2},
  {id: "PROFILE-03", file: "profile-03.html", reference: null, page: LETTER, marginMm: 0.6 * 25.4, identityColumns: 1}
];

const mime = path => path.endsWith(".html") ? "text/html; charset=utf-8"
  : path.endsWith(".css") ? "text/css; charset=utf-8"
  : path.endsWith(".js") || path.endsWith(".mjs") ? "text/javascript; charset=utf-8"
  : "application/octet-stream";

async function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const filePath = resolve(root, decodeURIComponent(url.pathname).replace(/^\/+/, ""));
      if (filePath !== root && !filePath.startsWith(root + sep)) throw new Error("outside root");
      if (!(await stat(filePath)).isFile()) throw new Error("not a file");
      response.writeHead(200, {"content-type": mime(filePath)});
      response.end(await readFile(filePath));
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  return {server, baseUrl: `http://127.0.0.1:${server.address().port}`};
}

const pdfText = path => execFileSync("pdftotext", ["-layout", path, "-"], {encoding: "utf8"});
const words = text => text.split(/\s+/).filter(Boolean);
// Hyphen-insensitive tokens for comparing two layouts of the same fixture, where
// a hyphenated word may break across lines differently.
const looseWords = text => text.split(/[\s-]+/).filter(Boolean);
const counts = list => list.reduce((map, word) => map.set(word, (map.get(word) ?? 0) + 1), new Map());
const subtract = (left, right) => [...left].flatMap(([word, count]) => Array(Math.max(0, count - (right.get(word) ?? 0))).fill(word)).sort();

function pdfInfo(path) {
  const info = execFileSync("pdfinfo", [path], {encoding: "utf8"});
  const [, width, height] = info.match(/^Page size:\s+([\d.]+) x ([\d.]+) pts/m) ?? [];
  return {pages: Number(info.match(/^Pages:\s+(\d+)/m)?.[1] ?? 0), width: Number(width), height: Number(height)};
}

// Word boxes from every page: [{page, xMin, yMin, xMax, yMax, text}].
function wordBoxes(path) {
  const html = execFileSync("pdftotext", ["-bbox", path, "-"], {encoding: "utf8", maxBuffer: 32 * 1024 * 1024});
  return html.split(/<page /).slice(1).flatMap((pageHtml, index) =>
    [...pageHtml.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)]
      .map(([, xMin, yMin, xMax, yMax, text]) => ({page: index + 1, xMin: Number(xMin), yMin: Number(yMin), xMax: Number(xMax), yMax: Number(yMax), text})));
}

function lastLines(path) {
  return pdfText(path).split("\f").map(page => page.split("\n").map(line => line.trim()).filter(Boolean).at(-1) ?? "").filter(Boolean);
}

async function openFixture(browser, baseUrl, fixture, {viewport = {width: 1100, height: 900}, media = "print", javaScriptEnabled = true} = {}) {
  const context = await browser.newContext({viewport, javaScriptEnabled});
  const page = await context.newPage();
  await page.emulateMedia({media});
  await page.goto(`${baseUrl}/${profileDir}/${fixture.file}`);
  await page.waitForLoadState("networkidle");
  if (javaScriptEnabled) await page.evaluate(() => customElements.whenDefined("ef-print-document"));
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  return {context, page};
}

// Recipe invariants that must hold in print media in every engine.
function printInvariants() {
  const rect = element => element.getBoundingClientRect();
  const overlaps = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
  const style = element => getComputedStyle(element);
  const identity = document.querySelector(".ef-identity");
  const identityRegions = [...identity.children];
  const rows = [...document.querySelectorAll(".ef-row")].map(row => {
    const end = row.querySelector(":scope > [data-row-end]");
    const primary = [...row.children].filter(child => child !== end);
    const endRect = rect(end);
    const lineHeight = parseFloat(style(end).lineHeight) || parseFloat(style(end).fontSize) * 1.25;
    return {
      text: row.textContent.replace(/\s+/g, " ").trim().slice(0, 80),
      tracks: style(row).gridTemplateColumns.split(" ").length,
      endRightGap: Math.abs(rect(row).right - endRect.right),
      endSingleLine: endRect.height <= lineHeight * 1.6,
      endOnFirstRow: endRect.top <= rect(primary[0]).top + lineHeight,
      collides: primary.some(child => overlaps(rect(child), endRect))
    };
  });
  const leadItems = [...document.querySelectorAll(".ef-lead-list > li")];
  const leads = [...document.querySelectorAll(".ef-lead-list > li > strong:first-child")];
  const inlineItems = [...document.querySelectorAll(".ef-inline-list > li")];
  const grids = [...document.querySelectorAll(".ef-category-grid")].map(grid => ({
    columns: new Set([...grid.children].map(child => Math.round(rect(child).left))).size,
    groupsAvoidBreak: [...grid.children].every(child => style(child).breakInside === "avoid"),
    clipped: [...grid.querySelectorAll("li, h3")].some(element => element.scrollWidth > element.clientWidth + 1)
  }));
  return {
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    identityColumns: style(identity).gridTemplateColumns.split(" ").length,
    identityOverlap: identityRegions.length > 1 && overlaps(rect(identityRegions[0]), rect(identityRegions[1])),
    nameDominant: parseFloat(style(identity.querySelector("h1")).fontSize) > parseFloat(style(identityRegions.at(-1)).fontSize) * 1.4,
    rows,
    leadItemsAreListItems: leadItems.length > 0 && leadItems.every(item => style(item).display === "list-item"),
    leadWeights: leads.map(lead => Number(style(lead).fontWeight)),
    detailWeights: leads.map(lead => Number(style(lead.parentElement).fontWeight)),
    inlineItemsInline: inlineItems.every(item => style(item).display === "inline"),
    inlineListsAreLists: [...document.querySelectorAll(".ef-inline-list")].every(list => list.tagName === "UL" || list.tagName === "OL"),
    grids,
    headingsKeepWithNext: [...document.querySelectorAll("h2, h3")].every(heading => ["avoid", "avoid-page"].includes(style(heading).breakAfter)),
    entryHeadersKeep: [...document.querySelectorAll(".ef-entry > :first-child:not(:last-child)")].every(header => ["avoid", "avoid-page"].includes(style(header).breakAfter)),
    headingOrder: [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map(heading => Number(heading.tagName[1]))
  };
}

function assertPrintInvariants(label, result) {
  assert.equal(result.pageOverflow, false, `${label}: no page-level horizontal overflow`);
  assert.equal(result.identityOverlap, false, `${label}: identity and contact regions do not overlap`);
  assert.equal(result.nameDominant, true, `${label}: name dominates the contact region`);
  assert.ok(result.rows.length >= 5, `${label}: fixture exercises aligned rows`);
  for (const row of result.rows) {
    assert.equal(row.tracks, 2, `${label}: row keeps two tracks in print: ${row.text}`);
    assert.ok(row.endRightGap < 1.5, `${label}: terminal metadata is end-aligned: ${row.text}`);
    assert.equal(row.endSingleLine, true, `${label}: terminal metadata stays on one line: ${row.text}`);
    assert.equal(row.endOnFirstRow, true, `${label}: terminal metadata aligns with the first primary line: ${row.text}`);
    assert.equal(row.collides, false, `${label}: terminal metadata does not collide with primary text: ${row.text}`);
  }
  assert.equal(result.leadItemsAreListItems, true, `${label}: accomplishment items keep list semantics`);
  assert.ok(result.leadWeights.every(weight => weight >= 600), `${label}: lead phrases are emphasized`);
  assert.ok(result.detailWeights.every(weight => weight < 600), `${label}: detail text stays regular weight`);
  assert.equal(result.inlineItemsInline, true, `${label}: inline collections flow inline`);
  assert.equal(result.inlineListsAreLists, true, `${label}: inline collections are native lists`);
  assert.ok(result.grids.length >= 1, `${label}: fixture exercises a category grid`);
  for (const grid of result.grids) {
    assert.ok(grid.columns >= 2, `${label}: category grid lays out multiple columns in print`);
    assert.equal(grid.groupsAvoidBreak, true, `${label}: category groups request keep-together`);
    assert.equal(grid.clipped, false, `${label}: category labels are not clipped`);
  }
  assert.equal(result.headingsKeepWithNext, true, `${label}: headings request keep-with-next`);
  assert.equal(result.entryHeadersKeep, true, `${label}: entry headers request keep-with-next`);
  assert.equal(result.headingOrder[0], 1, `${label}: document starts with one h1`);
  assert.ok(result.headingOrder.every((level, index) => index === 0 || level <= result.headingOrder[index - 1] + 1), `${label}: heading levels do not skip`);
}

// Screen-only behavior at established Folio phone widths.
function screenInvariants() {
  const rect = element => element.getBoundingClientRect();
  const identity = document.querySelector(".ef-identity");
  const rows = [...document.querySelectorAll(".ef-row")].map(row => {
    const end = row.querySelector(":scope > [data-row-end]");
    const primary = [...row.children].filter(child => child !== end);
    return {stacked: rect(end).top >= Math.max(...primary.map(child => rect(child).bottom)) - 1, right: rect(end).right, rowRight: rect(row).right};
  });
  return {
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    identityColumns: getComputedStyle(identity).gridTemplateColumns.split(" ").length,
    rows,
    widestElement: Math.max(...[...document.querySelectorAll("ef-print-document *")].map(element => rect(element).right)),
    viewport: document.documentElement.clientWidth,
    gridColumns: [...document.querySelectorAll(".ef-category-grid")].map(grid => new Set([...grid.children].map(child => Math.round(rect(child).left))).size)
  };
}

async function exportPdf(page, path) {
  await page.pdf({path, preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false});
  return path;
}

await rm(outputDir, {recursive: true, force: true});
await mkdir(outputDir, {recursive: true});

const {server, baseUrl} = await startServer();
const summary = {status: "passed", engines: selectedEngines, fixtures: {}};

try {
  // Deterministic Chromium PDF evidence.
  const browser = await chromium.launch();
  summary.rendererVersion = browser.version();

  for (const fixture of fixtures) {
    const label = `chromium ${fixture.id}`;
    const {context, page} = await openFixture(browser, baseUrl, fixture);
    assertPrintInvariants(label, await page.evaluate(printInvariants));
    const pdfPath = await exportPdf(page, resolve(outputDir, `${fixture.id.toLowerCase()}.pdf`));
    await context.close();

    const info = pdfInfo(pdfPath);
    assert.ok(Math.abs(info.width - fixture.page.width) < 2 && Math.abs(info.height - fixture.page.height) < 2, `${label}: page size ${info.width}x${info.height}`);

    // Content bounds: every word lies inside the authored page margins.
    const margin = fixture.marginMm * MM;
    const boxes = wordBoxes(pdfPath);
    const outside = boxes.filter(box => box.xMin < margin - 1 || box.yMin < margin - 1 || box.xMax > info.width - margin + 1 || box.yMax > info.height - margin + 1);
    assert.deepEqual(outside.map(box => `${box.page}:${box.text}`), [], `${label}: text stays inside the ${fixture.marginMm.toFixed(1)} mm content box`);

    // Keep intent: no page ends on a section or entry heading.
    const headings = await (async () => {
      const {context: headingContext, page: headingPage} = await openFixture(browser, baseUrl, fixture);
      const texts = await headingPage.evaluate(() => [...document.querySelectorAll("h2, h3, .ef-entry > header")].map(element => element.textContent.replace(/\s+/g, " ").trim()));
      await headingContext.close();
      return texts;
    })();
    const strandedHeadings = lastLines(pdfPath).slice(0, -1).filter(line => headings.some(heading => heading.startsWith(line.replace(/\s{2,}.*$/, ""))));
    assert.deepEqual(strandedHeadings, [], `${label}: no page ends on a heading or entry header`);

    const folioWords = counts(words(pdfText(pdfPath)));
    const result = {pages: info.pages, pageSize: `${info.width}x${info.height}`, words: [...folioWords.values()].reduce((a, b) => a + b, 0)};

    if (fixture.reference) {
      const reference = manifest.references[fixture.reference];
      const defects = manifest.referenceDefects.filter(defect => defect.variants.includes(fixture.reference));
      const referenceWords = counts(words(await readFile(resolve(root, profileDir, "reference", reference.file), "utf8")));
      const expectedMissing = defects.flatMap(defect => defect.words).sort();
      const expectedExtra = defects.flatMap(defect => defect.extraWords ?? []).sort();
      assert.deepEqual(subtract(referenceWords, folioWords), expectedMissing, `${label}: only declared reference defects are absent from the reproduction`);
      assert.deepEqual(subtract(folioWords, referenceWords), expectedExtra, `${label}: no duplicated or invented words beyond declared defect corrections`);
      assert.ok(Math.abs(info.pages - reference.pages) <= 1, `${label}: page count ${info.pages} is within one page of the reference ${reference.pages}`);
      Object.assign(result, {referencePages: reference.pages, declaredDefects: defects.map(defect => defect.id)});
    }

    // Letter adaptation: same words, Letter page box.
    const {context: letterContext, page: letterPage} = await openFixture(browser, baseUrl, fixture);
    await letterPage.addStyleTag({content: fixture.page === LETTER ? "@page { size: A4; }" : "@page { size: Letter; }"});
    const alternatePath = await exportPdf(letterPage, resolve(outputDir, `${fixture.id.toLowerCase()}-${fixture.page === LETTER ? "a4" : "letter"}.pdf`));
    await letterContext.close();
    const alternate = pdfInfo(alternatePath);
    const alternateSize = fixture.page === LETTER ? A4 : LETTER;
    assert.ok(Math.abs(alternate.width - alternateSize.width) < 2 && Math.abs(alternate.height - alternateSize.height) < 2, `${label}: alternate page size applies`);
    const primaryLoose = counts(looseWords(pdfText(pdfPath)));
    const alternateLoose = counts(looseWords(pdfText(alternatePath)));
    assert.deepEqual(subtract(primaryLoose, alternateLoose), [], `${label}: alternate page size loses no words`);
    assert.deepEqual(subtract(alternateLoose, primaryLoose), [], `${label}: alternate page size duplicates no words`);
    result.alternatePages = alternate.pages;

    // JavaScript disabled: the printed document is unchanged (FOLIO-RES-004).
    const {context: noScriptContext, page: noScriptPage} = await openFixture(browser, baseUrl, fixture, {javaScriptEnabled: false});
    const noScriptPath = await exportPdf(noScriptPage, resolve(outputDir, `${fixture.id.toLowerCase()}-no-js.pdf`));
    await noScriptContext.close();
    assert.equal(words(pdfText(noScriptPath)).join(" "), words(pdfText(pdfPath)).join(" "), `${label}: output without JavaScript is textually identical`);
    assert.equal(pdfInfo(noScriptPath).pages, info.pages, `${label}: output without JavaScript paginates identically`);

    summary.fixtures[fixture.id] = result;
  }
  await browser.close();

  // Portable screen and print-media behavior.
  for (const engineName of selectedEngines) {
    const engine = await engines[engineName].launch();
    for (const fixture of fixtures) {
      const label = `${engineName} ${fixture.id}`;
      const printView = await openFixture(engine, baseUrl, fixture);
      assertPrintInvariants(`${label} print`, await printView.page.evaluate(printInvariants));
      await printView.context.close();

      for (const width of [320, 390, 430]) {
        const screenView = await openFixture(engine, baseUrl, fixture, {viewport: {width, height: 900}, media: "screen"});
        const screen = await screenView.page.evaluate(screenInvariants);
        assert.equal(screen.overflow, false, `${label} @${width}px: no page-level horizontal overflow`);
        assert.ok(screen.widestElement <= screen.viewport + 1, `${label} @${width}px: no element extends past the viewport`);
        assert.equal(screen.identityColumns, 1, `${label} @${width}px: identity header stacks`);
        assert.ok(screen.rows.every(row => row.stacked), `${label} @${width}px: row terminal metadata moves below the primary text`);
        assert.ok(screen.gridColumns.every(columns => columns === 1), `${label} @${width}px: category grids collapse to one column`);

        await screenView.page.emulateMedia({media: "print"});
        const restored = await screenView.page.evaluate(printInvariants);
        assert.ok(restored.rows.every(row => row.tracks === 2), `${label} @${width}px: print media restores two-track rows`);
        assert.equal(restored.identityColumns, fixture.identityColumns, `${label} @${width}px: print media restores the authored identity/contact layout`);
        await screenView.context.close();
      }
    }
    await engine.close();
  }

  console.log(JSON.stringify(summary, null, 2));
} finally {
  await new Promise(resolvePromise => server.close(resolvePromise));
}
