// Journal / scholarly publication fixture tests (FOLIO-JRN-240..260).
//
// JOURNAL-ARTICLE-01 is a standalone two-column article; JOURNAL-ISSUE-01 is a
// complete multi-article issue. Assertions are semantic, textual, and coarse
// geometric checks on deterministic Chromium PDFs, plus computed-style recipe
// contracts and phone-width screen checks in every engine listed in
// FOLIO_ENGINES (default: chromium,firefox,webkit). No pixel comparisons.
//
// Only Chromium can export PDF through Playwright, so physical fragmentation,
// running matter, and page-number evidence is Chromium (P1/P2). Firefox and
// WebKit verify the portable print-media contract and screen behavior.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { chromium, firefox, webkit } from "playwright";

const root = resolve(new URL("..", import.meta.url).pathname);
const outputDir = resolve(root, "test-results/journal-fixtures");
const fixtureDir = "tests/fixtures/journal";

const engines = {chromium, firefox, webkit};
const selectedEngines = (process.env.FOLIO_ENGINES ?? "chromium,firefox,webkit").split(",").map(name => name.trim()).filter(Boolean);
assert.ok(selectedEngines.every(name => name in engines), `Unknown engine in FOLIO_ENGINES: ${selectedEngines.join(", ")}`);

const LETTER = {width: 612, height: 792};
const A4 = {width: 595.28, height: 841.89};

const fixtures = [
  {
    id: "JOURNAL-ARTICLE-01",
    file: "article-01.html",
    pages: [7, 10],
    articles: 1,
    runningHead: "Okafor et al.",
    landscape: true,
    repeatedHeader: "Impervious (%) Sky view Nights Cooling",
    bare: []
  },
  {
    id: "JOURNAL-ISSUE-01",
    file: "issue-01.html",
    pages: [16, 21],
    articles: 5,
    runningHead: null,
    landscape: false,
    repeatedHeader: null,
    bare: ["Special issue: Measuring the city at night", "MASTHEAD", "Original studies reporting new field observations", "Critical syntheses of methods", "Short communications", "Northmere Field Methods Summer School", "Special issue: Measuring the city at night. Guest editors"]
  }
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

// Text normalization shared by DOM and PDF sides: compatibility-fold (math
// italic glyphs become plain letters), lowercase, and keep letters/digits only.
// Removing separators makes the comparison independent of line breaking,
// hyphenation, column order, and authored versus generated punctuation.
const normalize = text => text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const alphaWords = text => (text.normalize("NFKC").toLowerCase().match(/\p{L}{4,}/gu) ?? []);
const countIn = (haystack, needle) => {
  let count = 0;
  for (let index = haystack.indexOf(needle); index !== -1; index = haystack.indexOf(needle, index + needle.length)) count += 1;
  return count;
};
const tally = list => list.reduce((map, word) => map.set(word, (map.get(word) ?? 0) + 1), new Map());

const pdfText = (path, page) => execFileSync("pdftotext", [...(page ? ["-f", String(page), "-l", String(page)] : []), path, "-"], {encoding: "utf8", maxBuffer: 64 * 1024 * 1024});
const pdfLayoutText = (path, page) => execFileSync("pdftotext", ["-layout", "-f", String(page), "-l", String(page), path, "-"], {encoding: "utf8"});

function pdfInfo(path) {
  const info = execFileSync("pdfinfo", ["-f", "1", "-l", "999", path], {encoding: "utf8"});
  const sizes = [...info.matchAll(/^Page\s+\d+ size:\s+([\d.]+) x ([\d.]+) pts/gm)].map(([, width, height]) => ({width: Number(width), height: Number(height)}));
  return {pages: Number(info.match(/^Pages:\s+(\d+)/m)?.[1] ?? 0), sizes};
}

function wordBoxes(path) {
  const html = execFileSync("pdftotext", ["-bbox", path, "-"], {encoding: "utf8", maxBuffer: 64 * 1024 * 1024});
  return html.split(/<page /).slice(1).map((pageHtml, index) => {
    const [, width, height] = pageHtml.match(/^width="([\d.]+)" height="([\d.]+)"/) ?? [];
    const words = [...pageHtml.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)]
      .map(([, xMin, yMin, xMax, yMax, text]) => ({xMin: Number(xMin), yMin: Number(yMin), xMax: Number(xMax), yMax: Number(yMax), text: text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"")}));
    return {page: index + 1, width: Number(width), height: Number(height), words};
  });
}

async function openFixture(browser, baseUrl, fixture, {viewport = {width: 1100, height: 900}, media = "print", javaScriptEnabled = true, css = true} = {}) {
  const context = await browser.newContext({viewport, javaScriptEnabled});
  if (!css) await context.route("**/*.css", route => route.abort());
  const page = await context.newPage();
  await page.emulateMedia({media});
  await page.goto(`${baseUrl}/${fixtureDir}/${fixture.file}`);
  await page.waitForLoadState("networkidle");
  if (javaScriptEnabled && css) await page.evaluate(() => customElements.whenDefined("ef-print-document"));
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  return {context, page};
}

async function exportPdf(page, path, {printBackground = true} = {}) {
  await page.pdf({path, preferCSSPageSize: true, printBackground, displayHeaderFooter: false, tagged: false});
  return path;
}

// Rendered text of the document as the DOM authors it: visible text nodes in
// source order, excluding SVG title/desc and anything not displayed in print.
function domText() {
  const parts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      for (let element = node.parentElement; element; element = element.parentElement) {
        if (["SCRIPT", "STYLE", "TITLE", "DESC"].includes(element.tagName.toUpperCase())) return NodeFilter.FILTER_REJECT;
        if (element.namespaceURI === "http://www.w3.org/2000/svg" && ["title", "desc"].includes(element.localName)) return NodeFilter.FILTER_REJECT;
        if (getComputedStyle(element).display === "none") return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  while (walker.nextNode()) parts.push(walker.currentNode.nodeValue);
  return parts.join(" ");
}

// Semantic and structural contract, independent of CSS layout.
function semanticContract() {
  const text = element => (element?.textContent ?? "").replace(/\s+/g, " ").trim();
  const ids = [...document.querySelectorAll("[id]")].map(element => element.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const brokenLinks = [...document.querySelectorAll("a[href^='#']")].map(link => link.getAttribute("href").slice(1)).filter(id => id && !document.getElementById(id));
  const labelledBy = element => (element.getAttribute("aria-labelledby") ?? "").split(/\s+/).filter(Boolean);
  const articles = [...document.querySelectorAll("article.ef-article")].map(article => {
    const headings = [...article.querySelectorAll("h1, h2, h3, h4, h5, h6")].map(heading => Number(heading.tagName[1]));
    const numbered = [...article.querySelectorAll(":scope h2")].map(text).map(value => value.match(/^(\d+)\s/)?.[1]).filter(Boolean).map(Number);
    return {
      id: article.id,
      labelled: labelledBy(article).every(id => document.getElementById(id)?.tagName === "H1") && labelledBy(article).length === 1,
      h1Count: article.querySelectorAll("h1").length,
      headingSkips: headings.some((level, index) => index > 0 && level > headings[index - 1] + 1),
      numberedInOrder: numbered.every((value, index) => index === 0 || value > numbered[index - 1]),
      kicker: text(article.querySelector(".ef-article-header [data-kicker]")),
      affiliationTargets: [...article.querySelectorAll(".ef-authors sup a[href^='#']")].map(link => document.getElementById(link.getAttribute("href").slice(1))?.closest(".ef-affiliations, ef-print-note")?.tagName ?? null),
      start: article.dataset.start ?? null
    };
  });
  const figures = [...document.querySelectorAll("figure:not(.ef-equation)")].map(figure => ({
    id: figure.id,
    captioned: Boolean(figure.querySelector(":scope > figcaption")) && labelledBy(figure).every(id => document.getElementById(id)),
    labelText: text(figure.querySelector("figcaption [data-label]"))
  }));
  const tables = [...document.querySelectorAll("table")].map(table => ({
    id: table.id,
    labelled: Boolean(table.querySelector(":scope > caption")) || (labelledBy(table).length > 0 && labelledBy(table).every(id => text(document.getElementById(id)).length > 0)),
    headerCells: table.querySelectorAll("thead th[scope='col']").length,
    rowHeaders: table.querySelectorAll("tbody th[scope='row']").length,
    rows: table.querySelectorAll("tbody tr").length
  }));
  const equations = [...document.querySelectorAll(".ef-equation")].map(equation => ({
    id: equation.id,
    number: text(equation.querySelector(":scope > figcaption")),
    hasMath: Boolean(equation.querySelector("math"))
  }));
  return {
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    duplicateIds,
    brokenLinks,
    articles,
    figures,
    tables,
    equations,
    abstracts: document.querySelectorAll(".ef-abstract").length,
    structuredAbstracts: document.querySelectorAll(".ef-abstract[data-variant='structured'] > section > h3").length,
    referenceLists: [...document.querySelectorAll(".ef-reference-list")].map(list => ({tag: list.tagName, items: list.children.length, style: list.dataset.style ?? "hanging"})),
    endnoteBacklinks: [...document.querySelectorAll(".ef-endnotes [data-backlink]")].map(link => Boolean(document.getElementById(link.getAttribute("href").slice(1)))),
    noteRefs: [...document.querySelectorAll("[role='doc-noteref']")].map(link => Boolean(document.getElementById(link.getAttribute("href").slice(1)))),
    declarations: [...document.querySelectorAll(".ef-declarations > section > h3")].map(text),
    metaTerms: [...document.querySelectorAll(".ef-meta-list dt")].map(text),
    keywords: document.querySelectorAll(".ef-labeled .ef-inline-list > li").length,
    divisions: document.querySelectorAll(".jrn-division").length,
    cover: Boolean(document.querySelector("ef-print-title-page")),
    backCover: document.querySelector("ef-print-document")?.lastElementChild?.tagName === "EF-PRINT-BACK-PAGE",
    tocTargets: [...document.querySelectorAll("ef-print-toc a")].map(link => document.getElementById(link.getAttribute("href").slice(1))?.tagName ?? null),
    tocPages: [...document.querySelectorAll("ef-print-toc li")].map(item => ({target: item.querySelector("a")?.getAttribute("href").slice(1), page: Number(item.querySelector("[data-page]")?.textContent)})),
    tocRenderer: document.querySelector("ef-print-toc")?.dataset.pagesRenderedWith ?? null,
    articlePages: [...document.querySelectorAll("article.ef-article")].map(article => getComputedStyle(article).page)
  };
}

function assertSemantics(label, fixture, result) {
  assert.ok(result.lang && result.lang.startsWith("en"), `${label}: document language is declared`);
  assert.equal(result.dir, "ltr", `${label}: text direction is declared`);
  assert.deepEqual(result.duplicateIds, [], `${label}: ids are unique (stable anchors)`);
  assert.deepEqual(result.brokenLinks, [], `${label}: every in-document cross-link resolves`);
  assert.equal(result.articles.length, fixture.articles, `${label}: article count`);
  for (const article of result.articles) {
    assert.equal(article.labelled, true, `${label} ${article.id}: article landmark is labelled by its h1`);
    assert.equal(article.h1Count, 1, `${label} ${article.id}: one h1 per article`);
    assert.equal(article.headingSkips, false, `${label} ${article.id}: heading levels do not skip`);
    assert.equal(article.numberedInOrder, true, `${label} ${article.id}: authored section numbers follow source order`);
    assert.ok(article.kicker.length > 0, `${label} ${article.id}: article type is authored`);
    assert.ok(article.affiliationTargets.every(Boolean), `${label} ${article.id}: author markers link to affiliations or the author note (FOLIO-JRN-021)`);
  }
  assert.ok(result.figures.length >= 2, `${label}: fixture exercises figures`);
  for (const figure of result.figures) assert.equal(figure.captioned, true, `${label} ${figure.id}: figure has an associated caption`);
  for (const table of result.tables) {
    assert.equal(table.labelled, true, `${label} ${table.id}: table has a caption or a resolvable label`);
    assert.ok(table.headerCells > 0, `${label} ${table.id}: table has column headers`);
  }
  for (const equation of result.equations) {
    assert.match(equation.number, /^\(\d+\)$/, `${label} ${equation.id}: equation number is authored text`);
    assert.equal(equation.hasMath, true, `${label} ${equation.id}: equation carries consumer MathML`);
  }
  assert.ok(result.abstracts >= 1, `${label}: abstract present`);
  assert.ok(result.endnoteBacklinks.every(Boolean), `${label}: endnote backlinks resolve`);
  assert.ok(result.noteRefs.every(Boolean), `${label}: note references resolve`);
  assert.ok(result.declarations.length >= 1, `${label}: declarations are authored`);
  assert.ok(result.keywords >= 1 || fixture.articles > 1, `${label}: keywords exercised`);
}

// Recipe and primitive print contract (computed style), evaluated in every engine.
function printContract() {
  const style = element => getComputedStyle(element);
  const all = selector => [...document.querySelectorAll(selector)];
  return {
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    columns: all("ef-print-columns").map(element => style(element).columnCount),
    spans: all(".ef-column-span, .ef-article-header").map(element => style(element).columnSpan),
    articleStarts: all(".ef-article[data-start]").map(element => style(element).breakBefore),
    headingKeeps: all(".ef-longform h2, .ef-longform h3").filter(heading => style(heading).display !== "inline").map(heading => style(heading).breakAfter),
    figureKeeps: all("ef-print-figure, .ef-equation").map(element => style(element).breakInside),
    referenceItems: all(".ef-reference-list > li").map(item => ({indent: parseFloat(style(item).textIndent), padding: parseFloat(style(item).paddingInlineStart), keep: style(item).breakInside})),
    equationTracks: all(".ef-equation").map(element => style(element).gridTemplateColumns.split(" ").length),
    metaTracks: all(".ef-meta-list:not([data-layout])").map(element => style(element).gridTemplateColumns.split(" ").length),
    runInHeadings: all(".ef-declarations > section > h3:first-child, .ef-abstract[data-variant='structured'] > section > h3:first-child").map(element => style(element).display),
    tableHeaders: all("ef-print-table thead").map(element => style(element).display),
    justified: all(".ef-longform ef-print-columns > section > p").slice(0, 5).map(element => style(element).textAlign),
    captionWeight: all(".ef-caption [data-label]").map(element => Number(style(element).fontWeight)),
    authorsInline: all(".ef-authors > li").map(element => style(element).display),
    textContrast: (() => {
      // Relative luminance contrast against white survives grayscale conversion (FOLIO-JRN-145).
      const luminance = color => {
        const [r, g, b] = (color.match(/[\d.]+/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number).map(value => value / 255).map(value => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const ratios = all("body *").filter(element => [...element.childNodes].some(node => node.nodeType === 3 && node.nodeValue.trim())).map(element => 1.05 / (luminance(style(element).color) + 0.05));
      return Math.min(...ratios);
    })()
  };
}

function assertPrintContract(label, result) {
  assert.equal(result.pageOverflow, false, `${label}: no page-level horizontal overflow in print media`);
  assert.ok(result.columns.length >= 1 && result.columns.every(count => count === "2"), `${label}: multicolumn bodies keep two columns in print (${result.columns})`);
  assert.ok(result.spans.every(value => value === "all"), `${label}: column-span recipes span all columns`);
  assert.ok(result.articleStarts.every(value => value === "page"), `${label}: articles with data-start begin on a new page`);
  assert.ok(result.headingKeeps.every(value => ["avoid", "avoid-page"].includes(value)), `${label}: headings request keep-with-next`);
  assert.ok(result.figureKeeps.every(value => value === "avoid"), `${label}: figures and equations request keep-together`);
  for (const item of result.referenceItems) {
    assert.ok(item.indent < 0 || item.padding > 0, `${label}: reference items hang`);
    assert.equal(item.keep, "avoid", `${label}: reference items request keep-together`);
  }
  assert.ok(result.equationTracks.every(count => count === 3), `${label}: equations keep the centered three-track layout in print`);
  assert.ok(result.metaTracks.every(count => count === 2), `${label}: metadata lists keep label/value tracks in print`);
  assert.ok(result.runInHeadings.every(value => value === "inline"), `${label}: declaration and structured-abstract labels run in`);
  assert.ok(result.tableHeaders.every(value => value === "table-header-group"), `${label}: table headers repeat where the renderer supports it`);
  assert.ok(result.justified.every(value => value === "justify"), `${label}: long-form body text is justified in print`);
  assert.ok(result.captionWeight.every(weight => weight >= 600), `${label}: caption labels are emphasized`);
  assert.ok(result.authorsInline.every(value => value === "inline"), `${label}: author list flows inline`);
  assert.ok(result.textContrast >= 4.5, `${label}: every text color keeps at least 4.5:1 contrast for grayscale output (${result.textContrast.toFixed(2)})`);
}

function screenInvariants() {
  const style = element => getComputedStyle(element);
  const scrollContained = element => {
    for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      if (["auto", "scroll"].includes(style(parent).overflowX)) return true;
    }
    return false;
  };
  const viewport = document.documentElement.clientWidth;
  const escapes = [...document.querySelectorAll("body *")]
    .filter(element => !scrollContained(element) && element.getBoundingClientRect().right > viewport + 1 && element.getBoundingClientRect().width > 0)
    .map(element => `${element.tagName.toLowerCase()}${element.id ? "#" + element.id : ""}${element.className && typeof element.className === "string" ? "." + element.className.split(" ")[0] : ""}`);
  return {
    overflow: document.documentElement.scrollWidth > viewport + 1,
    escapes: [...new Set(escapes)].slice(0, 10),
    columns: [...document.querySelectorAll("ef-print-columns")].map(element => style(element).columnCount),
    metaTracks: [...document.querySelectorAll(".ef-meta-list:not([data-layout])")].map(element => style(element).gridTemplateColumns.split(" ").length),
    equationTracks: [...document.querySelectorAll(".ef-equation")].map(element => style(element).gridTemplateColumns.split(" ").length),
    textAlign: [...document.querySelectorAll(".ef-longform ef-print-columns > section > p")].slice(0, 3).map(element => style(element).textAlign),
    referenceLinksWrap: [...document.querySelectorAll(".ef-reference-list a, .ef-meta-list a")].every(link => link.getBoundingClientRect().right <= viewport + 1)
  };
}

// First page (after skip) whose upper 40% begins the given title in display type (> 14pt): up to six consecutive title words.
function openingPage(boxes, title, skip = 0, {display = true} = {}) {
  const tokens = title.split(/\s+/).filter(Boolean).slice(0, 6).map(token => token.toLowerCase());
  return boxes.slice(skip).find(({height, words}) => words.some((word, index) => (!display || (word.yMin < height * 0.4 && word.yMax - word.yMin > 14)) && tokens.every((token, offset) => words[index + offset]?.text.toLowerCase() === token)))?.page ?? null;
}

// Heading text must be followed by body text below it, in the same column, on the same page.
function strandedHeadings(boxes, headings) {
  const stranded = [];
  for (const heading of headings) {
    const tokens = heading.split(/\s+/).filter(Boolean).slice(0, 3).map(token => token.toLowerCase());
    for (const page of boxes) {
      for (let index = 0; index <= page.words.length - tokens.length; index += 1) {
        if (!tokens.every((token, offset) => page.words[index + offset].text.toLowerCase() === token)) continue;
        const start = page.words[index];
        const end = page.words[index + tokens.length - 1];
        // A heading stands alone on its line within its column; prose that merely contains the words does not.
        const sameLine = (word, other) => other && Math.abs(other.yMin - word.yMin) < 1.5;
        const before = page.words[index - 1];
        const after = page.words[index + tokens.length];
        if (sameLine(start, before) && start.xMin - before.xMax < 30) continue;
        if (tokens.length === heading.split(/\s+/).filter(Boolean).length && sameLine(end, after) && after.xMin - end.xMax < 30) continue;
        const following = page.words.filter(word => word.yMin > end.yMax + 0.5 && Math.abs(word.xMin - start.xMin) < 60 && word.yMin < end.yMax + 72);
        if (following.length === 0) stranded.push(`${page.page}: ${heading}`);
      }
    }
  }
  return stranded;
}

function pagesContaining(path, pages, phrase) {
  const needle = normalize(phrase);
  return Array.from({length: pages}, (_, index) => index + 1).filter(page => normalize(pdfText(path, page)).includes(needle));
}

// Content conservation: every DOM word of four or more letters occurs in the PDF
// at least as often as in the DOM, and the PDF adds no more letters than its
// running matter, list markers, and page numbers account for.
function conservation(label, domStream, domWords, pdfPath, pages) {
  const pdfStream = normalize(pdfText(pdfPath));
  const missing = [...tally(domWords)].filter(([word, count]) => countIn(pdfStream, word) < Math.min(count, countIn(domStream, word))).map(([word]) => word);
  assert.deepEqual(missing, [], `${label}: no authored words are lost across page and column fragmentation`);
  const allowance = pages * 140 + domStream.length * 0.01;
  assert.ok(pdfStream.length <= domStream.length + allowance, `${label}: no duplicated content (${pdfStream.length} PDF letters vs ${domStream.length} DOM letters + ${Math.round(allowance)} furniture allowance)`);
  assert.ok(pdfStream.length >= domStream.length * 0.99, `${label}: PDF carries at least 99% of DOM letters (${pdfStream.length} vs ${domStream.length})`);
  return pdfStream;
}

await rm(outputDir, {recursive: true, force: true});
await mkdir(outputDir, {recursive: true});

const {server, baseUrl} = await startServer();
const summary = {status: "passed", engines: selectedEngines, fixtures: {}};

try {
  const browser = await chromium.launch();
  summary.rendererVersion = browser.version();
  const chromiumMajor = Number(summary.rendererVersion.split(".")[0]);

  for (const fixture of fixtures) {
    const label = `chromium ${fixture.id}`;
    const slug = fixture.id.toLowerCase();
    const {context, page} = await openFixture(browser, baseUrl, fixture);
    const semantics = await page.evaluate(semanticContract);
    assertSemantics(label, fixture, semantics);
    assertPrintContract(label, await page.evaluate(printContract));
    const dom = await page.evaluate(domText);
    const headings = await page.evaluate(() => [...document.querySelectorAll(".ef-article h2, .ef-article h3")].filter(heading => getComputedStyle(heading).display !== "inline").map(heading => heading.textContent.replace(/\s+/g, " ").trim()));
    const figureChecks = await page.evaluate(() => [...document.querySelectorAll("ef-print-figure figure")].map(figure => ({
      id: figure.id,
      caption: figure.querySelector("figcaption").textContent.replace(/\s+/g, " ").trim().slice(0, 48),
      art: [...figure.querySelectorAll("svg text")].at(-1)?.textContent ?? ""
    })));
    const tableChecks = await page.evaluate(() => [...document.querySelectorAll("table")].map(table => ({
      id: table.id,
      label: (table.caption ?? document.getElementById((table.getAttribute("aria-labelledby") ?? "").split(" ")[0]))?.textContent.replace(/\s+/g, " ").trim().slice(0, 40),
      firstRow: table.tBodies[0]?.rows[0]?.textContent.replace(/\s+/g, " ").trim().slice(0, 30)
    })));
    const pdfPath = await exportPdf(page, resolve(outputDir, `${slug}.pdf`));
    await context.close();

    const info = pdfInfo(pdfPath);
    const result = {pages: info.pages, landscapePages: info.sizes.map((size, index) => size.width > size.height ? index + 1 : null).filter(Boolean)};
    assert.ok(info.pages >= fixture.pages[0] && info.pages <= fixture.pages[1], `${label}: ${info.pages} pages within ${fixture.pages.join("-")}`);
    const portrait = info.sizes.filter(size => size.width < size.height);
    assert.ok(portrait.every(size => Math.abs(size.width - LETTER.width) < 2 && Math.abs(size.height - LETTER.height) < 2), `${label}: portrait pages are Letter`);

    const domStream = normalize(dom);
    const domWords = alphaWords(dom);
    conservation(label, domStream, domWords, pdfPath, info.pages);

    // Physical page counter: "Page X of N" is continuous on every page that carries running matter.
    const boxes = wordBoxes(pdfPath);
    const pageLabels = boxes.map(({page}) => pdfLayoutText(pdfPath, page).match(/Page (\d+) of (\d+)/));
    const counted = pageLabels.map((match, index) => match ? {page: index + 1, x: Number(match[1]), of: Number(match[2])} : null).filter(Boolean);
    assert.ok(counted.length >= Math.min(3, info.pages - 1), `${label}: P1 page counters are present`);
    assert.ok(counted.every(entry => entry.x === entry.page && entry.of === info.pages), `${label}: counter(page)/counter(pages) are continuous physical numbers`);
    result.pagesWithCounter = counted.length;

    // Running matter is suppressed on bare/cover pages (FOLIO-JRN-124).
    for (const phrase of fixture.bare) {
      for (const pageNumber of pagesContaining(pdfPath, info.pages, phrase)) {
        assert.equal(pageLabels[pageNumber - 1], null, `${label}: no page counter on bare page ${pageNumber} (${phrase})`);
        assert.doesNotMatch(pdfLayoutText(pdfPath, pageNumber), /Vol\. 14 · No\. 4/, `${label}: no running head on bare page ${pageNumber}`);
      }
    }

    // First page versus running pages (FOLIO-JRN-123/244).
    if (fixture.runningHead) {
      const withHead = Array.from({length: info.pages}, (_, index) => index + 1).filter(number => pdfLayoutText(pdfPath, number).split("\n").slice(0, 4).join(" ").includes(fixture.runningHead));
      assert.ok(!withHead.includes(1), `${label}: the opening page has no running head`);
      assert.equal(withHead.length, info.pages - 1, `${label}: every continuation page has the article running head`);
    }

    // Pages up to and including the contents page repeat article titles; openings are searched after it.
    const contentsPage = semantics.tocPages.length ? pagesContaining(pdfPath, info.pages, "Contents Volume 14")[0] ?? 0 : 0;

    // Article boundaries: each article title starts in the upper part of a page.
    const titles = await (async () => {
      const {context: titleContext, page: titlePage} = await openFixture(browser, baseUrl, fixture);
      const list = await titlePage.evaluate(() => [...document.querySelectorAll("article.ef-article h1")].map(heading => heading.textContent.replace(/\s+/g, " ").trim()));
      await titleContext.close();
      return list;
    })();
    result.articleStartPages = {};
    for (const title of titles) {
      const opening = openingPage(boxes, title, contentsPage);
      assert.ok(opening, `${label}: article "${title}" opens in the upper part of a page`);
      result.articleStartPages[title] = opening;
    }

    // Authored TOC values versus physical pages (FOLIO-JRN-254): enforced only on the renderer that produced them.
    if (semantics.tocPages.length) {
      const anchors = await (async () => {
        const {context: anchorContext, page: anchorPage} = await openFixture(browser, baseUrl, fixture);
        const list = await anchorPage.evaluate(() => [...document.querySelectorAll("ef-print-toc a")].map(link => {
          const target = document.getElementById(link.getAttribute("href").slice(1));
          const heading = target.querySelector("h1") ?? target.querySelector("h2") ?? target;
          return {title: heading.textContent.replace(/\s+/g, " ").trim(), display: heading.tagName === "H1"};
        }));
        await anchorContext.close();
        return list;
      })();
      const comparisons = semantics.tocPages.map((entry, index) => {
        const physical = openingPage(boxes, anchors[index].title, contentsPage, {display: anchors[index].display});
        return {target: entry.target, authored: entry.page, physical};
      });
      result.toc = {renderedWith: semantics.tocRenderer, comparisons};
      const authoredMajor = Number(semantics.tocRenderer?.match(/Chromium (\d+)/)?.[1] ?? NaN);
      result.toc.enforced = authoredMajor === chromiumMajor;
      if (result.toc.enforced) {
        assert.deepEqual(comparisons.filter(item => item.authored !== item.physical), [], `${label}: authored TOC pages match the ${semantics.tocRenderer} render`);
      }
    }

    // Two-column flow: a continuation page carries substantial text in both column halves.
    const columnPage = boxes.find(({page, width, words}) => page > 1 && words.filter(word => word.xMax < width / 2 - 6).length > 80 && words.filter(word => word.xMin > width / 2 + 6).length > 80);
    assert.ok(columnPage, `${label}: two-column fragmentation produces filled left and right columns`);

    // Column spans: at least one caption line crosses the column gutter.
    const spanning = boxes.some(({width, words}) => words.some((word, index) => /^(Figure|Table)$/.test(word.text) && words[index + 1]?.text.match(/^\d+\.$/) && words.filter(other => Math.abs(other.yMin - word.yMin) < 2).some(other => other.xMax > width / 2 + 40) && word.xMin < width / 2 - 40));
    assert.equal(spanning, true, `${label}: a figure or table caption spans the column gutter`);

    assert.deepEqual(strandedHeadings(boxes, headings), [], `${label}: no section heading is stranded at the foot of a page or column`);

    for (const figure of figureChecks.filter(item => item.art)) {
      const shared = pagesContaining(pdfPath, info.pages, figure.caption).filter(number => pagesContaining(pdfPath, info.pages, figure.art).includes(number));
      assert.ok(shared.length > 0, `${label} ${figure.id}: figure artwork and caption share a page`);
    }
    for (const table of tableChecks.filter(item => item.label && item.firstRow)) {
      const shared = pagesContaining(pdfPath, info.pages, table.label).filter(number => pagesContaining(pdfPath, info.pages, table.firstRow).includes(number));
      assert.ok(shared.length > 0, `${label} ${table.id}: table label and first row share a page`);
    }

    if (fixture.repeatedHeader) {
      const headerPages = pagesContaining(pdfPath, info.pages, fixture.repeatedHeader);
      assert.ok(headerPages.length >= 2, `${label}: multi-page table header repeats (${headerPages})`);
      result.repeatedHeaderPages = headerPages;
    }
    if (fixture.landscape) {
      assert.ok(result.landscapePages.length >= 1, `${label}: named landscape page is produced`);
      const appendixPages = pagesContaining(pdfPath, info.pages, "Appendix A. Sensor intercalibration");
      assert.ok(appendixPages.every(number => result.landscapePages.includes(number)), `${label}: the wide appendix table is on a landscape page`);
      assert.ok(pagesContaining(pdfPath, info.pages, "PA-S05").every(number => result.landscapePages.includes(number)), `${label}: the wide table finishes on a landscape page`);
    }

    // A4 adaptation: same content, A4 page box.
    const {context: a4Context, page: a4Page} = await openFixture(browser, baseUrl, fixture);
    await a4Page.addStyleTag({content: "@page { size: A4; } @page bare { size: A4; } @page wide { size: A4 landscape; }"});
    const a4Path = await exportPdf(a4Page, resolve(outputDir, `${slug}-a4.pdf`));
    await a4Context.close();
    const a4 = pdfInfo(a4Path);
    assert.ok(a4.sizes.filter(size => size.width < size.height).every(size => Math.abs(size.width - A4.width) < 2 && Math.abs(size.height - A4.height) < 2), `${label}: A4 page box applies`);
    conservation(`${label} A4`, domStream, domWords, a4Path, a4.pages);
    result.a4Pages = a4.pages;

    // JavaScript disabled: custom elements never upgrade; output is unchanged (registration independence).
    const {context: noScriptContext, page: noScriptPage} = await openFixture(browser, baseUrl, fixture, {javaScriptEnabled: false});
    const noScriptPath = await exportPdf(noScriptPage, resolve(outputDir, `${slug}-no-js.pdf`));
    await noScriptContext.close();
    assert.equal(normalize(pdfText(noScriptPath)), normalize(pdfText(pdfPath)), `${label}: output without JavaScript is textually identical`);
    assert.equal(pdfInfo(noScriptPath).pages, info.pages, `${label}: output without JavaScript paginates identically`);

    // Backgrounds disabled: nothing meaningful is lost (FOLIO-JRN-145/245).
    const {context: plainContext, page: plainPage} = await openFixture(browser, baseUrl, fixture);
    const plainPath = await exportPdf(plainPage, resolve(outputDir, `${slug}-no-backgrounds.pdf`), {printBackground: false});
    await plainContext.close();
    conservation(`${label} backgrounds disabled`, domStream, domWords, plainPath, pdfInfo(plainPath).pages);

    // Without CSS: content remains meaningful and in reading order (FOLIO-JRN-027/160).
    const {context: rawContext, page: rawPage} = await openFixture(browser, baseUrl, fixture, {css: false, media: "screen"});
    const rawOrder = await rawPage.evaluate(() => {
      const text = document.body.innerText;
      const article = document.querySelector("article.ef-article");
      const markers = [article.querySelector("h1"), article.querySelector(".ef-authors"), article.querySelector(".ef-abstract h2"), article.querySelector("ef-print-columns h2"), article.querySelector("[role='doc-bibliography'] h2, .ef-declarations h2")]
        .filter(Boolean).map(element => text.indexOf(element.innerText.trim().split("\n")[0]));
      return {markers, length: text.length, links: document.querySelectorAll("a[href^='https://doi.org/']").length};
    });
    await rawContext.close();
    assert.ok(rawOrder.markers.every(position => position >= 0), `${label}: front matter, abstract, body, and back matter render without CSS`);
    assert.ok(rawOrder.markers.every((position, index) => index === 0 || position > rawOrder.markers[index - 1]), `${label}: unstyled reading order is title, authors, abstract, body, back matter`);
    assert.ok(rawOrder.links > 0, `${label}: DOI links remain links without CSS`);

    result.headingsChecked = headings.length;
    result.figuresChecked = figureChecks.length;
    result.tablesChecked = tableChecks.length;
    summary.fixtures[fixture.id] = result;
  }
  await browser.close();

  // Portable print-media contract and phone-width screen behavior in every selected engine.
  for (const engineName of selectedEngines) {
    const engine = await engines[engineName].launch();
    for (const fixture of fixtures) {
      const label = `${engineName} ${fixture.id}`;
      const printView = await openFixture(engine, baseUrl, fixture);
      assertSemantics(`${label} print`, fixture, await printView.page.evaluate(semanticContract));
      assertPrintContract(`${label} print`, await printView.page.evaluate(printContract));
      await printView.context.close();

      for (const width of [320, 390, 430]) {
        const screenView = await openFixture(engine, baseUrl, fixture, {viewport: {width, height: 900}, media: "screen"});
        const screen = await screenView.page.evaluate(screenInvariants);
        assert.equal(screen.overflow, false, `${label} @${width}px: no page-level horizontal overflow`);
        assert.deepEqual(screen.escapes, [], `${label} @${width}px: no element extends past the viewport outside a contained scroller`);
        assert.ok(screen.columns.every(count => count === "1"), `${label} @${width}px: multicolumn bodies collapse to one column`);
        assert.ok(screen.metaTracks.every(count => count === 1), `${label} @${width}px: metadata lists stack`);
        assert.ok(screen.equationTracks.every(count => count === 2), `${label} @${width}px: equations keep math and number without centering gutters`);
        assert.ok(screen.textAlign.every(value => value === "start"), `${label} @${width}px: narrow-screen body text is not justified`);
        assert.equal(screen.referenceLinksWrap, true, `${label} @${width}px: long DOI and URL links wrap inside the viewport`);

        await screenView.page.emulateMedia({media: "print"});
        const restored = await screenView.page.evaluate(printContract);
        assert.ok(restored.columns.every(count => count === "2"), `${label} @${width}px: print media restores two columns`);
        assert.ok(restored.equationTracks.every(count => count === 3), `${label} @${width}px: print media restores equation layout`);
        assert.ok(restored.metaTracks.every(count => count === 2), `${label} @${width}px: print media restores metadata tracks`);
        await screenView.context.close();
      }
    }
    await engine.close();
  }

  await writeFile(resolve(outputDir, "results.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await new Promise(resolvePromise => server.close(resolvePromise));
}
