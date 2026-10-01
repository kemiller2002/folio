// JOURNAL-ENHANCED-01 experiment (EX-PRINT-2026-0008, FOLIO-JRN-248).
//
// Compares deterministic Chromium (P2) with an optional enhanced paged-media
// renderer (P3; Vivliostyle, the research-posture candidate) on the same
// semantic sources. The enhanced renderer is NOT a Folio dependency
// (DF-PRINT-2026-0005, FOLIO-JRN-258): install it out of tree and point
// VIVLIOSTYLE_CLI at its executable, for example
//
//   npm install --prefix /tmp/viv @vivliostyle/cli@11.3.3
//   VIVLIOSTYLE_CLI=/tmp/viv/node_modules/.bin/vivliostyle \
//   VIVLIOSTYLE_BROWSER=/path/to/chromium npm run experiment:journal-enhanced
//
// Without VIVLIOSTYLE_CLI only the Chromium leg runs and the P3 leg is recorded
// as unavailable. Content conservation is asserted for every renderer that runs;
// enhanced features are recorded as observations, never promoted to promises.
import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { chromium } from "playwright";

const root = resolve(new URL("..", import.meta.url).pathname);
const outputDir = resolve(root, "test-results/journal-enhanced");
const fixtureDir = "tests/fixtures/journal";
const fixtures = ["enhanced-01.html", "article-01.html", "issue-01.html"];
const cli = process.env.VIVLIOSTYLE_CLI ?? null;
const hostBrowser = process.env.VIVLIOSTYLE_BROWSER ?? null;

const mime = path => path.endsWith(".html") ? "text/html; charset=utf-8" : path.endsWith(".css") ? "text/css; charset=utf-8" : path.endsWith(".js") ? "text/javascript; charset=utf-8" : "application/octet-stream";
const normalize = text => text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const alphaWords = text => text.normalize("NFKC").toLowerCase().match(/\p{L}{4,}/gu) ?? [];
const countIn = (haystack, needle) => {
  let count = 0;
  for (let index = haystack.indexOf(needle); index !== -1; index = haystack.indexOf(needle, index + needle.length)) count += 1;
  return count;
};
const pdfText = (path, page) => execFileSync("pdftotext", [...(page ? ["-f", String(page), "-l", String(page)] : []), path, "-"], {encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"]});
const pdfLayout = (path, page) => execFileSync("pdftotext", ["-layout", "-f", String(page), "-l", String(page), path, "-"], {encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]});

function pdfInfo(path) {
  const info = execFileSync("pdfinfo", ["-f", "1", "-l", "999", path], {encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]});
  const sizes = [...info.matchAll(/^Page\s+\d+ size:\s+([\d.]+) x ([\d.]+) pts/gm)].map(([, width, height]) => ({width: Number(width), height: Number(height)}));
  return {pages: Number(info.match(/^Pages:\s+(\d+)/m)?.[1] ?? 0), sizes};
}

function wordBoxes(path) {
  const html = execFileSync("pdftotext", ["-bbox", path, "-"], {encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"]});
  return html.split(/<page /).slice(1).map((pageHtml, index) => ({
    page: index + 1,
    height: Number(pageHtml.match(/height="([\d.]+)"/)?.[1] ?? 0),
    words: [...pageHtml.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)].map(([, xMin, yMin, , yMax, text]) => ({x: Number(xMin), y: Number(yMin), yMax: Number(yMax), text}))
  }));
}

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

function conservation(label, dom, pdfPath, pages) {
  const domStream = normalize(dom);
  const pdfStream = normalize(pdfText(pdfPath));
  const words = new Map();
  for (const word of alphaWords(dom)) words.set(word, (words.get(word) ?? 0) + 1);
  const missing = [...words].filter(([word, count]) => countIn(pdfStream, word) < Math.min(count, countIn(domStream, word))).map(([word]) => word);
  assert.deepEqual(missing, [], `${label}: no authored words are lost`);
  // Enhanced renderers add footnote calls/markers and target-page text; allow them with the furniture.
  const allowance = pages * 160 + domStream.length * 0.02;
  assert.ok(pdfStream.length <= domStream.length + allowance, `${label}: no duplicated content (${pdfStream.length} vs ${domStream.length} + ${Math.round(allowance)})`);
  return {domLetters: domStream.length, pdfLetters: pdfStream.length, missing: missing.length};
}

// Feature observations for JOURNAL-ENHANCED-01 in one PDF.
function observeEnhanced(path) {
  const info = pdfInfo(path);
  const boxes = wordBoxes(path);
  const text = pdfText(path);
  const pageOf = phrase => boxes.find(({page}) => normalize(pdfText(path, page)).includes(normalize(phrase)))?.page ?? null;
  const footnoteText = "The 1911 building code";
  const footnotePage = boxes.find(({words}) => words.some((word, index) => word.text === "1911" && words[index - 1]?.text === "The"));
  const footnoteWord = footnotePage?.words.find((word, index) => word.text === "1911" && footnotePage.words[index - 1]?.text === "The");
  const openings = ["Night cooling in enclosed", "Report the cloud screen", "Erratum: courtyard sample"].map(title => {
    const page = boxes.find(({words}) => {
      const tokens = title.split(" ");
      return words.some((word, index) => word.yMax - word.y > 14 && tokens.every((token, offset) => words[index + offset]?.text === token));
    })?.page ?? null;
    const head = page ? pdfLayout(path, page).split("\n").slice(0, 3).join(" ") : "";
    return {title, page, recto: page ? page % 2 === 1 : null, articleHeadOnOpening: /Whitcombe & Laine ·|Laine · Report|Editors · Erratum/.test(head)};
  });
  const blankPages = boxes.filter(({words}) => words.length === 0).map(({page}) => page);
  const figure2Caption = boxes.flatMap(({page, words}) => words.map((word, index) => ({page, word, next: words[index + 1]}))).find(({word, next}) => word.text === "Figure" && next?.text === "2.");
  const title1 = boxes.flatMap(({page, words}) => words.map((word, index) => ({page, word, next: words[index + 1]}))).find(({word, next}) => word.text === "Night" && next?.text === "cooling" && word.yMax - word.y > 14);
  return {
    pages: info.pages,
    pageSize: info.sizes[0],
    bleedOrMarksArea: info.sizes[0].width > 612 + 10,
    trueFootnote: Boolean(footnoteWord && footnoteWord.y > footnotePage.height * 0.75 && !/\(Note:/.test(text)),
    inFlowNoteFallback: /\(Note:\s*The 1911 building code/.test(text.replace(/\s+/g, " ")),
    footnotePage: footnotePage?.page ?? null,
    targetPageReferences: (text.replace(/\s+/g, " ").match(/Figure \d \(p\. \d+\)/g) ?? []).length,
    continuationRunningHead: /Whitcombe & Laine · Night cooling in courtyards/.test(pdfLayout(path, 2).split("\n").slice(0, 3).join(" ")),
    openings,
    blankPages,
    figure2: figure2Caption ? {page: figure2Caption.page, aboveArticleTitle: Boolean(title1 && title1.page === figure2Caption.page && figure2Caption.word.y < title1.word.y)} : null,
    footnoteTextPresent: normalize(text).includes(normalize(footnoteText))
  };
}

await rm(outputDir, {recursive: true, force: true});
await mkdir(outputDir, {recursive: true});
const {server, baseUrl} = await startServer();
const summary = {experiment: "JOURNAL-ENHANCED-01", chromium: {}, enhanced: {}};

try {
  const browser = await chromium.launch();
  summary.chromium.version = browser.version();
  const domTexts = {};
  for (const file of fixtures) {
    const context = await browser.newContext({viewport: {width: 1100, height: 900}});
    const page = await context.newPage();
    await page.emulateMedia({media: "print"});
    await page.goto(`${baseUrl}/${fixtureDir}/${file}`);
    await page.waitForLoadState("networkidle");
    await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
    domTexts[file] = await page.evaluate(domText);
    const pdfPath = resolve(outputDir, `chromium-${file.replace(".html", ".pdf")}`);
    await page.pdf({path: pdfPath, preferCSSPageSize: true, printBackground: true});
    await context.close();
    const info = pdfInfo(pdfPath);
    summary.chromium[file] = {pages: info.pages, conservation: conservation(`chromium ${file}`, domTexts[file], pdfPath, info.pages)};
    if (file === "enhanced-01.html") summary.chromium[file].features = observeEnhanced(pdfPath);
  }
  await browser.close();

  // P0/P2 fallback contract for the enhanced source: nothing is lost and nothing is faked.
  const fallback = summary.chromium["enhanced-01.html"].features;
  assert.equal(fallback.trueFootnote, false, "chromium: no simulated bottom-of-page footnotes");
  assert.equal(fallback.inFlowNoteFallback, true, "chromium: notes remain readable in flow");
  assert.equal(fallback.targetPageReferences, 0, "chromium: no estimated target-page numbers");

  if (!cli || !existsSync(cli)) {
    summary.enhanced = {status: "unavailable", reason: "VIVLIOSTYLE_CLI is not set to an installed executable; the P3 leg did not run."};
  } else {
    summary.enhanced.renderer = execFileSync(cli, ["--version"], {encoding: "utf8"}).trim().replace(/\s+/g, " ");
    summary.enhanced.hostBrowser = hostBrowser ?? "renderer default";
    for (const file of fixtures) {
      const pdfPath = resolve(outputDir, `vivliostyle-${file.replace(".html", ".pdf")}`);
      // Asynchronous: this process also serves the fixtures the renderer is fetching.
      await promisify(execFile)(cli, ["build", `${baseUrl}/${fixtureDir}/${file}`, "-o", pdfPath, ...(hostBrowser ? ["--executable-browser", hostBrowser] : [])], {encoding: "utf8", timeout: 600000});
      const info = pdfInfo(pdfPath);
      summary.enhanced[file] = {pages: info.pages, landscapePages: info.sizes.map((size, index) => size.width > size.height ? index + 1 : null).filter(Boolean), conservation: conservation(`enhanced ${file}`, domTexts[file], pdfPath, info.pages)};
      if (file === "enhanced-01.html") summary.enhanced[file].features = observeEnhanced(pdfPath);
    }
    summary.enhanced.status = "ran";
  }

  await writeFile(resolve(outputDir, "results.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await new Promise(resolvePromise => server.close(resolvePromise));
}
