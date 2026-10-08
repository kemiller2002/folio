// FORMA-ICON-PRINT-01 (GH-45): pinned Forma icons through Folio's real print
// pipeline. Composes self-contained documents with tools/forma-icon-print.mjs,
// prints them offline with Chromium page.pdf (every request blocked and
// recorded), and proves from the PDFs themselves: Letter and A4 page size and
// count, vector icon geometry, grayscale and backgrounds-disabled output that
// still states every status in words, role/name accessibility, visual
// regression against committed glyph masks, and that the bundled bytes are the
// pinned release's bytes. The same document is also printed under the
// repository's real Forma pin, which (at 0.4.1) publishes no icons.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { inflateSync } from "node:zlib";
import { chromium } from "playwright";
import { compareVersions, loadFormaPin, loadIconLibrary, sha256Hex } from "../tools/forma-icons.mjs";
import { composeIconPrintDocument, openOfflineDocument, printOfflinePdf } from "../tools/forma-icon-print.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const fixtureDir = resolve(root, "tests/fixtures/forma-icons");
const fixtureIcons = resolve(fixtureDir, "forma-0.5.0/dist/icons");
const outputDir = resolve(root, "test-results/forma-icon-print");
const baselinePath = resolve(fixtureDir, "visual-baseline.json");
const updateBaseline = process.env.FOLIO_UPDATE_ICON_BASELINE === "1";
const packageDir = process.env.FOLIO_FORMA_PACKAGE_DIR;

const provenance = JSON.parse(readFileSync(resolve(fixtureDir, "forma-0.5.0/PROVENANCE.json"), "utf8"));
const fixtureRegistry = JSON.parse(readFileSync(resolve(fixtureIcons, "registry.json"), "utf8"));
const body = readFileSync(resolve(fixtureDir, "status-report.html"), "utf8");
const documentCss = readFileSync(resolve(fixtureDir, "status-report.css"), "utf8");
const printCss = readFileSync(resolve(root, "src/styles/print.css"), "utf8");

const repositoryPin = loadFormaPin(root);
// The fixture may be ahead of the repository pin; it is used *as if* pinned
// only here, and the provenance check below keeps its label honest against the
// real pin.
const fixturePin = Object.freeze({ systemId: "forma", version: provenance.formaVersion, source: `test fixture (${provenance.status})` });
const fixtureLibrary = loadIconLibrary({ pin: fixturePin, assetsRoot: fixtureIcons });
const pinnedLibrary = loadIconLibrary({ pin: repositoryPin, assetsRoot: fixtureIcons });

const statuses = ["Status: Passed", "Status: Warning", "Status: Failed", "Status: Pending"];
const geometryNames = ["success", "warning", "close", "clock", "shield", "workflow", "search", "print"];
const tints = { passed: [0xdd, 0xf3, 0xe4], warning: [0xff, 0xf0, 0xcc], failed: [0xfd, 0xe0, 0xde], pending: [0xe6, 0xeb, 0xf2] };
const maskSize = 16;
// Sub-pixel placement moved up to 12 cells between Letter and A4 locally; the
// two most similar distinct glyphs (success, clock) differ in 39.
const maskTolerance = 20;
const rasterDpi = 144;

const passed = [];
const check = async (name, fn) => {
  await fn();
  passed.push(name);
};

// ---------------------------------------------------------------------------
// PDF inspection (Poppler + zlib; no PDF library dependency)
// ---------------------------------------------------------------------------

const pdfInfo = (path) => {
  const info = execFileSync("pdfinfo", [path], { encoding: "utf8" });
  const [, width, height] = info.match(/^Page size:\s+([\d.]+) x ([\d.]+) pts/m);
  return {
    pages: Number(info.match(/^Pages:\s+(\d+)/m)[1]),
    width: Number(width),
    height: Number(height),
    tagged: info.match(/^Tagged:\s+(\S+)/m)?.[1] ?? "unknown"
  };
};
const pdfText = (path) => execFileSync("pdftotext", [path, "-"], { encoding: "utf8" }).normalize("NFKC").replace(/\s+/g, " ").trim();
const words = (text) => text.split(" ").filter(Boolean).sort();
const pdfWords = (path, page) => {
  const raw = execFileSync("pdftotext", ["-bbox", "-f", String(page), "-l", String(page), path, "-"], { encoding: "utf8" });
  return [...raw.matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">([^<]*)<\/word>/g)]
    .map((m) => ({ xMin: Number(m[1]), yMin: Number(m[2]), xMax: Number(m[3]), yMax: Number(m[4]), text: m[5] }));
};

/** Decompressed content streams; Chromium writes Flate-encoded streams. */
const pdfStreams = (bytes) => {
  const source = bytes.toString("latin1");
  return [...source.matchAll(/stream\r?\n/g)].flatMap((match) => {
    const start = match.index + match[0].length;
    const end = source.indexOf("endstream", start);
    const dictionary = source.slice(Math.max(0, match.index - 400), match.index);
    if (end < 0 || !dictionary.includes("/FlateDecode")) return [];
    try {
      return [inflateSync(bytes.subarray(start, end)).toString("latin1")];
    } catch {
      return [];
    }
  });
};
const pdfVectorSummary = (bytes) => {
  const streams = pdfStreams(bytes);
  const count = (pattern) => streams.reduce((sum, stream) => sum + (stream.match(pattern) ?? []).length, 0);
  return {
    strokeOps: count(/(?:^|\s)S(?=\s)/g),
    curveOps: count(/(?:^|\s)c(?=\s)/g),
    imageXObjects: (bytes.toString("latin1").match(/\/Subtype\s*\/Image/g) ?? []).length
  };
};

/** Rasterizes one page; returns width, height, channels and pixel bytes. */
const raster = (path, page, { gray = false } = {}) => {
  const bytes = execFileSync("pdftoppm", ["-r", String(rasterDpi), "-f", String(page), "-l", String(page), ...(gray ? ["-gray"] : []), path], { maxBuffer: 64 * 1024 * 1024 });
  const header = bytes.subarray(0, 64).toString("latin1").split(/\s+/);
  const [magic, width, height] = [header[0], Number(header[1]), Number(header[2])];
  const channels = magic === "P5" ? 1 : 3;
  return { width, height, channels, data: bytes.subarray(bytes.length - width * height * channels) };
};
const pixelAt = (image, x, y) => {
  const offset = (y * image.width + x) * image.channels;
  return image.channels === 1 ? [image.data[offset], image.data[offset], image.data[offset]] : [image.data[offset], image.data[offset + 1], image.data[offset + 2]];
};
const luminance = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
const pxPerPt = rasterDpi / 72;
const toPx = (pt) => Math.round(pt * pxPerPt);
const range = (from, to) => Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i);
const inkPoints = (image, box) =>
  range(toPx(box.y0), toPx(box.y1)).flatMap((y) => range(toPx(box.x0), toPx(box.x1)).filter((x) => luminance(pixelAt(image, x, y)) < 140).map((x) => [x, y]));
const countNear = (image, rgb, tolerance = 4) => {
  let total = 0;
  for (let i = 0; i < image.width * image.height; i += 1) {
    const offset = i * 3;
    if (Math.abs(image.data[offset] - rgb[0]) <= tolerance && Math.abs(image.data[offset + 1] - rgb[1]) <= tolerance && Math.abs(image.data[offset + 2] - rgb[2]) <= tolerance) total += 1;
  }
  return total;
};
const maxChroma = (image) => {
  let max = 0;
  for (let i = 0; i < image.width * image.height; i += 1) {
    const [r, g, b] = pixelAt(image, i % image.width, Math.floor(i / image.width));
    max = Math.max(max, Math.max(r, g, b) - Math.min(r, g, b));
  }
  return max;
};

/**
 * A translation-independent glyph signature: the ink bounding box found left of
 * the printed name, resampled to a 16x16 mask. Size is reported separately.
 */
const glyphSignature = (image, label) => {
  const box = { x0: label.xMin - 72, x1: label.xMin - 2, y0: (label.yMin + label.yMax) / 2 - 36, y1: (label.yMin + label.yMax) / 2 + 36 };
  const points = inkPoints(image, box);
  assert.ok(points.length > 40, `no glyph ink beside ${label.text}`);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const ink = new Set(points.map(([x, y]) => `${x},${y}`));
  const cell = (i, j) => {
    const [x0, x1] = [minX + ((maxX - minX + 1) * j) / maskSize, minX + ((maxX - minX + 1) * (j + 1)) / maskSize];
    const [y0, y1] = [minY + ((maxY - minY + 1) * i) / maskSize, minY + ((maxY - minY + 1) * (i + 1)) / maskSize];
    const xsIn = range(Math.floor(x0), Math.ceil(x1));
    const ysIn = range(Math.floor(y0), Math.ceil(y1));
    const dark = ysIn.flatMap((y) => xsIn.filter((x) => ink.has(`${x},${y}`))).length;
    return dark / Math.max(1, xsIn.length * ysIn.length) >= 0.2 ? "1" : "0";
  };
  return {
    mask: range(0, maskSize).map((i) => range(0, maskSize).map((j) => cell(i, j)).join("")).join("/"),
    widthPt: Number(((maxX - minX + 1) / pxPerPt).toFixed(2)),
    heightPt: Number(((maxY - minY + 1) / pxPerPt).toFixed(2))
  };
};
const maskDistance = (a, b) => [...a].reduce((sum, bit, i) => sum + (bit !== b[i] ? 1 : 0), 0);
const sheetSignatures = (path, page, options) => {
  const image = raster(path, page, options);
  const labels = pdfWords(path, page);
  return Object.fromEntries(geometryNames.map((name) => {
    const label = labels.find((word) => word.text === `GEOM-${name}`);
    assert.ok(label, `GEOM-${name} is not printed on page ${page}`);
    return [name, glyphSignature(image, label)];
  }));
};
/** Dark pixels just left of each printed "Status:" word: the status glyph. */
const statusGlyphInk = (path, options) => {
  const image = raster(path, 1, options);
  return pdfWords(path, 1).filter((word) => word.text === "Status:").map((word) =>
    inkPoints(image, { x0: word.xMin - 18, x1: word.xMin - 0.5, y0: word.yMin - 2, y1: word.yMax + 2 }).length);
};

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const compose = (library, page) => composeIconPrintDocument({
  title: "FORMA-ICON-PRINT-01 release readiness",
  body,
  page,
  stylesheets: [printCss],
  documentCss,
  library
});

const documents = {
  letter: compose(fixtureLibrary, "letter"),
  a4: compose(fixtureLibrary, "a4"),
  pinnedLetter: compose(pinnedLibrary, "letter")
};

const inspectDom = async (page) => page.evaluate(() => {
  const icons = [...document.querySelectorAll(".ef-print-icon")];
  const contextText = (icon) => {
    const context = icon.closest("td, p, li, figure");
    const clone = context.cloneNode(true);
    clone.querySelectorAll(".ef-print-icon").forEach((node) => node.remove());
    return clone.textContent.replace(/\s+/g, " ").trim();
  };
  const unknown = document.querySelector('[data-ef-icon="future-rocket"]');
  return {
    iconCount: icons.length,
    decorative: icons.filter((icon) => icon.getAttribute("aria-hidden") === "true").length,
    decorativeWithoutWords: icons.filter((icon) => icon.getAttribute("aria-hidden") === "true" && !contextText(icon)).map((icon) => icon.dataset.efIcon),
    svgWithoutHiddenGlyph: icons.filter((icon) => icon.querySelector("svg")?.getAttribute("aria-hidden") !== "true").length,
    geometrySizes: [...document.querySelectorAll(".geometry-sheet .ef-print-icon")].map((icon) => Math.round(icon.getBoundingClientRect().width * 100) / 100),
    unknown: unknown && {
      hidden: unknown.hidden,
      state: unknown.dataset.efIconState,
      children: unknown.childElementCount,
      display: getComputedStyle(unknown).display
    },
    scripts: document.scripts.length,
    externalResources: performance.getEntriesByType("resource").map((entry) => entry.name)
  };
});

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await Promise.all(Object.entries(documents).map(([name, composed]) => writeFile(resolve(outputDir, `${name}.html`), composed.html)));

const browser = await chromium.launch();
const rendererVersion = browser.version();
const pdfPaths = {
  letter: resolve(outputDir, "forma-icon-print-letter-color.pdf"),
  a4: resolve(outputDir, "forma-icon-print-a4-color.pdf"),
  letterBackgroundsOff: resolve(outputDir, "forma-icon-print-letter-backgrounds-off.pdf"),
  letterGrayscale: resolve(outputDir, "forma-icon-print-letter-grayscale.pdf"),
  pinnedLetter: resolve(outputDir, `forma-icon-print-letter-pinned-forma-${repositoryPin.version}.pdf`)
};

const withPage = async (fn) => {
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  try {
    return await fn(page);
  } finally {
    await page.close();
  }
};

const results = { experiment: "FORMA-ICON-PRINT-01", rendererVersion, repositoryPin, fixture: provenance.status, checks: passed };

try {
  await check("the committed icon fixture is honestly labelled against the real Forma pin", () => {
    assert.equal(fixtureLibrary.status, "available", JSON.stringify(fixtureLibrary.findings));
    assert.equal(fixtureRegistry.formaVersion, provenance.formaVersion);
    const order = compareVersions(repositoryPin.version, provenance.formaVersion);
    assert.ok(order <= 0, `the Forma pin ${repositoryPin.version} is newer than the ${provenance.formaVersion} icon fixture; refresh it (tests/fixtures/forma-icons/SOURCE.md)`);
    if (order < 0) {
      // Ahead of the pin: either a labelled pre-release copy, or bytes verified
      // against a published release the Registry does not select yet.
      assert.ok(["pre-release-unpublished", "published"].includes(provenance.status), `unexpected fixture status ${provenance.status}`);
      if (provenance.status === "published") assert.match(provenance.source.artifactSha256, /^[0-9a-f]{64}$/);
      assert.equal(pinnedLibrary.status, "unavailable", "an icon-less pin must not render icons");
      assert.deepEqual(pinnedLibrary.findings, []);
    } else {
      assert.equal(provenance.status, "published", "the pin reached the fixture version; the fixture must come from the published release");
      assert.equal(provenance.source.artifactSha256, repositoryPin.packageSha256, "fixture bytes must come from the pinned release artifact");
      assert.equal(pinnedLibrary.status, "available");
    }
  });

  await check("bundled geometry is byte-identical to the pinned registry digests", () => {
    for (const entry of fixtureRegistry.icons) {
      assert.equal(sha256Hex(readFileSync(resolve(fixtureIcons, `${entry.name}.svg`))), entry.svgSha256, entry.name);
      const embedded = fixtureLibrary.icons.get(entry.name).svg;
      assert.ok(documents.letter.html.includes(embedded.replace("<svg ", '<svg aria-hidden="true" focusable="false" ')), `${entry.name} geometry is embedded verbatim`);
    }
    assert.ok(documents.letter.html.includes('data-ef-icon-forma="0.5.0"'));
    assert.deepEqual(documents.letter.references.filter((r) => r.state !== "rendered").map((r) => [r.name, r.state]), [["future-rocket", "unknown"]]);
    assert.ok(documents.pinnedLetter.references.every((r) => r.state === "unavailable"));
    assert.ok(!documents.pinnedLetter.html.includes("<svg"), "the icon-less pin embeds no geometry");
  });

  const dom = {};
  await check("offline HTML: no request, no script, only inline resources", async () => {
    for (const [name, composed] of Object.entries(documents)) {
      dom[name] = await withPage(async (page) => {
        const session = await openOfflineDocument(page, composed.html);
        const observed = await inspectDom(page);
        assert.deepEqual(session.requests(), [], `${name} made network requests`);
        assert.deepEqual(observed.externalResources, [], `${name} loaded resources`);
        assert.equal(observed.scripts, 0);
        return observed;
      });
    }
  });

  await check("the offline guard really observes a request when one is attempted", async () => {
    const leaky = documents.letter.html.replace("</body>", '<img src="http://127.0.0.1:9/leak.png" alt=""></body>');
    const requests = await withPage(async (page) => (await openOfflineDocument(page, leaky)).requests());
    assert.deepEqual(requests, ["http://127.0.0.1:9/leak.png"]);
  });

  await check("screen readers get status words and one application-named image, not icon names", async () => {
    assert.equal(dom.letter.iconCount, 14);
    assert.equal(dom.letter.decorative, 13);
    assert.deepEqual(dom.letter.decorativeWithoutWords, [], "a decorative icon must sit next to words that carry its meaning");
    assert.equal(dom.letter.svgWithoutHiddenGlyph, 0);
    assert.deepEqual(dom.letter.unknown, { hidden: true, state: "unknown", children: 0, display: "none" });
    assert.deepEqual(dom.pinnedLetter.unknown, { hidden: true, state: "unavailable", children: 0, display: "none" });
    assert.equal(dom.pinnedLetter.iconCount, 0);
    await withPage(async (page) => {
      await openOfflineDocument(page, documents.letter.html);
      assert.equal(await page.getByRole("img").count(), 1);
      assert.equal(await page.getByRole("img", { name: "Workflow stage: release", exact: true }).count(), 1);
      for (const [row, status] of [["Offline HTML", "Status: Passed"], ["Grayscale print", "Status: Warning"], ["Release pin", "Status: Failed"], ["Visual review", "Status: Pending"]]) {
        const cell = page.getByRole("row", { name: new RegExp(row) }).getByRole("cell", { name: status, exact: true });
        assert.equal(await cell.count(), 1, `${row}: accessible cell name is exactly '${status}'`);
        assert.ok(await cell.isVisible(), `${row}: status text is visible`);
      }
      const snapshot = await page.getByRole("table").ariaSnapshot();
      for (const status of statuses) assert.ok(snapshot.includes(status), `table snapshot lacks ${status}`);
      assert.doesNotMatch(snapshot, /\bimg\b|Success|Close|Time\b/, "icon registry labels must not leak into the accessible table");
      assert.ok(await page.getByText("FUTURE-ICON-TEXT").isVisible());
    });
    await withPage(async (page) => {
      await openOfflineDocument(page, documents.pinnedLetter.html);
      assert.equal(await page.getByRole("img").count(), 0);
      for (const status of statuses) assert.ok(await page.getByText(status, { exact: true }).first().isVisible(), `${status} visible without icons`);
    });
  });

  await check("forced colors keep icons in the text colour", async () => {
    await withPage(async (page) => {
      await openOfflineDocument(page, documents.letter.html, { forcedColors: "active" });
      const colors = await page.evaluate(() => [...document.querySelectorAll(".status-table .ef-print-icon")].map((icon) => [getComputedStyle(icon).color, getComputedStyle(icon.closest("td")).color]));
      assert.equal(colors.length, 4);
      for (const [icon, text] of colors) assert.equal(icon, text);
    });
  });

  await check("icon size follows the reference, not the glyph", () => {
    assert.deepEqual(dom.letter.geometrySizes, geometryNames.map(() => 64), "48pt sheet icons are 64 CSS px");
  });

  const printed = {};
  await withPage(async (page) => { printed.letter = await printOfflinePdf(page, documents.letter, { path: pdfPaths.letter }); });
  await withPage(async (page) => { printed.a4 = await printOfflinePdf(page, documents.a4, { path: pdfPaths.a4 }); });
  await withPage(async (page) => { printed.letterBackgroundsOff = await printOfflinePdf(page, documents.letter, { path: pdfPaths.letterBackgroundsOff, printBackground: false }); });
  await withPage(async (page) => { printed.pinnedLetter = await printOfflinePdf(page, documents.pinnedLetter, { path: pdfPaths.pinnedLetter }); });
  // A grayscale printer's device conversion of the colour PDF (as in the diagram
  // suite): vectors and text survive, colour does not.
  execFileSync("gs", ["-q", "-dNOPAUSE", "-dBATCH", "-dSAFER", "-sDEVICE=pdfwrite", "-sColorConversionStrategy=Gray", "-dProcessColorModel=/DeviceGray", `-sOutputFile=${pdfPaths.letterGrayscale}`, pdfPaths.letter]);

  const info = Object.fromEntries(Object.entries(pdfPaths).map(([name, path]) => [name, pdfInfo(path)]));
  const texts = Object.fromEntries(Object.entries(pdfPaths).map(([name, path]) => [name, pdfText(path)]));
  const vectors = Object.fromEntries(Object.entries(printed).map(([name, result]) => [name, pdfVectorSummary(result.pdf)]));

  await check("printing made no network request", () => {
    for (const [name, result] of Object.entries(printed)) assert.deepEqual(result.requests, [], name);
  });

  await check("Letter and A4 PDFs have the right page size and two pages", () => {
    for (const name of ["letter", "letterBackgroundsOff", "pinnedLetter", "letterGrayscale"]) {
      assert.ok(Math.abs(info[name].width - 612) < 1 && Math.abs(info[name].height - 792) < 1, `${name}: ${info[name].width}x${info[name].height}`);
      assert.equal(info[name].pages, 2, `${name} pages`);
    }
    assert.ok(Math.abs(info.a4.width - 595.28) < 1 && Math.abs(info.a4.height - 841.89) < 1, `a4: ${info.a4.width}x${info.a4.height}`);
    assert.equal(info.a4.pages, 2);
    assert.equal(info.letter.tagged, "yes");
  });

  await check("every output states every status in words; icons add no text", () => {
    for (const [name, text] of Object.entries(texts)) {
      for (const status of statuses) assert.ok(text.includes(status), `${name} lacks ${status}`);
      assert.ok(text.includes("FUTURE-ICON-TEXT"), `${name} lost the text around the unknown icon`);
      for (const glyph of geometryNames) assert.ok(text.includes(`GEOM-${glyph}`), `${name} lacks GEOM-${glyph}`);
      assert.ok(!/future-rocket|Workflow stage: release/.test(text), `${name} printed icon data as text`);
    }
    assert.equal(texts.letter, texts.pinnedLetter, "icons changed extracted text");
    assert.equal(texts.letterBackgroundsOff, texts.letter, "backgrounds-off changed extracted text");
    assert.deepEqual(words(texts.letterGrayscale), words(texts.letter), "grayscale changed extracted text");
    assert.deepEqual(words(texts.a4), words(texts.letter), "A4 changed extracted text");
  });

  await check("icons are vector strokes in the PDF, not images", () => {
    for (const [name, summary] of Object.entries(vectors)) assert.equal(summary.imageXObjects, 0, `${name} contains raster images`);
    const added = vectors.letter.strokeOps - vectors.pinnedLetter.strokeOps;
    assert.ok(added >= 14, `expected at least one stroke per rendered icon (14), got ${added}`);
    assert.ok(vectors.letter.curveOps > vectors.pinnedLetter.curveOps, "curved icon geometry (circles, quadratic joins) is absent");
    assert.equal(vectors.letterBackgroundsOff.strokeOps, vectors.letter.strokeOps, "backgrounds-off dropped icon strokes");
    assert.ok(vectors.a4.strokeOps - vectors.pinnedLetter.strokeOps >= 14);
  });

  const statusInk = {
    letter: statusGlyphInk(pdfPaths.letter),
    a4: statusGlyphInk(pdfPaths.a4),
    letterBackgroundsOff: statusGlyphInk(pdfPaths.letterBackgroundsOff),
    letterGrayscale: statusGlyphInk(pdfPaths.letterGrayscale, { gray: true }),
    pinnedLetter: statusGlyphInk(pdfPaths.pinnedLetter)
  };
  await check("status glyphs print beside their words in colour, A4, grayscale and backgrounds-off", () => {
    // Without icons the four table rows have no ink left of "Status:", so the
    // ink measured there with icons is the glyph. (The fifth word starts the
    // callout line, where the icon-less print reaches the callout's left rule.)
    assert.equal(statusInk.pinnedLetter.length, 5);
    assert.deepEqual(statusInk.pinnedLetter.slice(0, 4), [0, 0, 0, 0], "table rows carry no other ink beside the status word");
    for (const name of ["letter", "letterBackgroundsOff", "letterGrayscale", "a4"]) {
      assert.equal(statusInk[name].length, 5, `${name}: five printed status words`);
      statusInk[name].forEach((ink, i) => assert.ok(ink > 30, `${name}: status glyph ${i} ink ${ink}`));
    }
  });

  await check("colour tints are decoration: present in colour, gone without backgrounds, no chroma in grayscale", () => {
    const color = raster(pdfPaths.letter, 1);
    const off = raster(pdfPaths.letterBackgroundsOff, 1);
    for (const [status, rgb] of Object.entries(tints)) {
      assert.ok(countNear(color, rgb) > 200, `colour PDF lacks the ${status} tint`);
      assert.equal(countNear(off, rgb), 0, `backgrounds-off still paints the ${status} tint`);
    }
    assert.ok(maxChroma(raster(pdfPaths.letterGrayscale, 1)) <= 3, "grayscale PDF still has colour");
  });

  const signatures = {
    letter: sheetSignatures(pdfPaths.letter, 2),
    a4: sheetSignatures(pdfPaths.a4, 2),
    letterBackgroundsOff: sheetSignatures(pdfPaths.letterBackgroundsOff, 2),
    letterGrayscale: sheetSignatures(pdfPaths.letterGrayscale, 2, { gray: true })
  };
  if (updateBaseline) {
    await writeFile(baselinePath, `${JSON.stringify({
      schemaVersion: 1,
      fixture: "FORMA-ICON-PRINT-01 geometry sheet (page 2), Letter colour PDF",
      formaVersion: fixtureLibrary.formaVersion,
      method: `Chromium page.pdf -> pdftoppm ${rasterDpi}dpi; ink (luminance < 140) bounding box beside each GEOM-<name> label resampled to ${maskSize}x${maskSize}; cell is ink when >= 20% dark; compared by differing cells (tolerance ${maskTolerance}) plus printed width/height within 1.5pt`,
      generatedWith: { chromium: rendererVersion, poppler: spawnSync("pdftoppm", ["-v"], { encoding: "utf8" }).stderr.split("\n")[0].trim() || "unknown" },
      tolerance: maskTolerance,
      glyphs: signatures.letter
    }, null, 2)}\n`);
    console.warn(`Updated ${baselinePath}; review the diff before committing.`);
  }
  const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  const distances = Object.fromEntries(Object.entries(signatures).map(([output, glyphs]) => [output, Object.fromEntries(geometryNames.map((name) => [name, maskDistance(glyphs[name].mask, baseline.glyphs[name].mask)]))]));

  await check("visual regression: printed glyphs match the committed baseline in every output", () => {
    assert.equal(baseline.formaVersion, fixtureLibrary.formaVersion, "baseline belongs to another Forma version");
    for (const [output, glyphs] of Object.entries(distances)) {
      for (const [name, distance] of Object.entries(glyphs)) assert.ok(distance <= maskTolerance, `${output}/${name} differs from the baseline in ${distance} of ${maskSize * maskSize} cells`);
    }
    for (const [output, glyphs] of Object.entries(signatures)) {
      for (const name of geometryNames) {
        assert.ok(Math.abs(glyphs[name].widthPt - baseline.glyphs[name].widthPt) <= 1.5, `${output}/${name} width ${glyphs[name].widthPt}pt`);
        assert.ok(Math.abs(glyphs[name].heightPt - baseline.glyphs[name].heightPt) <= 1.5, `${output}/${name} height ${glyphs[name].heightPt}pt`);
      }
    }
  });

  await check("printed scale matches the release geometry, and status glyphs stay distinguishable without colour", () => {
    // success and clock are a r=9 circle on the 24-unit grid with a 1.8 stroke:
    // (2*9 + 1.8) units at 48pt/24 = 39.6pt across.
    for (const name of ["success", "clock"]) {
      for (const output of Object.keys(signatures)) {
        assert.ok(Math.abs(signatures[output][name].widthPt - 39.6) <= 1.5, `${output}/${name} printed ${signatures[output][name].widthPt}pt, expected 39.6pt`);
        assert.ok(Math.abs(signatures[output][name].heightPt - 39.6) <= 1.5, `${output}/${name} printed ${signatures[output][name].heightPt}pt high`);
      }
    }
    const statusGlyphs = ["success", "warning", "close", "clock"];
    for (const a of statusGlyphs) {
      for (const b of statusGlyphs.filter((name) => name > a)) {
        const distance = maskDistance(signatures.letterGrayscale[a].mask, signatures.letterGrayscale[b].mask);
        assert.ok(distance >= 30, `${a} and ${b} are too similar in grayscale (${distance} cells)`);
      }
    }
  });

  if (packageDir) {
    await check(`local Forma package at FOLIO_FORMA_PACKAGE_DIR matches the fixture and prints every icon`, async () => {
      const packageIcons = resolve(packageDir, "dist/icons");
      const packageRegistry = JSON.parse(readFileSync(resolve(packageIcons, "registry.json"), "utf8"));
      assert.equal(packageRegistry.formaVersion, provenance.formaVersion);
      for (const entry of fixtureRegistry.icons) {
        assert.deepEqual(entry, packageRegistry.icons.find((candidate) => candidate.name === entry.name), `${entry.name} registry entry differs from the package`);
        assert.deepEqual(readFileSync(resolve(fixtureIcons, `${entry.name}.svg`)), readFileSync(resolve(packageIcons, `${entry.name}.svg`)), `${entry.name}.svg differs from the package`);
      }
      const packageLibrary = loadIconLibrary({ pin: Object.freeze({ systemId: "forma", version: packageRegistry.formaVersion }), assetsRoot: packageIcons });
      assert.equal(packageLibrary.status, "available", JSON.stringify(packageLibrary.findings));
      const names = [...packageLibrary.icons.keys()];
      const gallery = composeIconPrintDocument({
        title: "Forma icon gallery",
        page: "a4",
        stylesheets: [printCss],
        documentCss: ".gallery{list-style:none;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:10pt}.gallery li{display:flex;gap:6pt;align-items:center;white-space:nowrap}",
        body: `<ef-print-document><ef-print-section><h1>Forma ${packageRegistry.formaVersion} icons</h1><ul class="gallery">${names.map((name) => `<li><span data-ef-icon="${name}" data-ef-icon-size="24pt"></span> <span>ICON-${name}</span></li>`).join("")}</ul></ef-print-section></ef-print-document>`,
        library: packageLibrary
      });
      const galleryPdf = resolve(outputDir, `forma-${packageRegistry.formaVersion}-package-gallery-a4.pdf`);
      const printedGallery = await withPage((page) => printOfflinePdf(page, gallery, { path: galleryPdf }));
      assert.deepEqual(printedGallery.requests, []);
      const galleryText = pdfText(galleryPdf);
      for (const name of names) assert.ok(galleryText.includes(`ICON-${name}`), name);
      const galleryVectors = pdfVectorSummary(printedGallery.pdf);
      assert.ok(galleryVectors.strokeOps >= names.length && galleryVectors.imageXObjects === 0);
      results.packageGallery = { iconCount: names.length, pdf: galleryPdf, info: pdfInfo(galleryPdf), vectors: galleryVectors };
    });
  }

  Object.assign(results, {
    status: "passed",
    pdfs: Object.fromEntries(Object.entries(pdfPaths).map(([name, path]) => [name, { path, ...info[name] }])),
    vectors,
    statusInk,
    maskDistances: distances,
    references: { letter: documents.letter.references.length, pinned: documents.pinnedLetter.references.map((r) => r.state).filter((s, i, all) => all.indexOf(s) === i) },
    pins: { repository: repositoryPin.version, fixture: `${fixturePin.version} (${provenance.status})` },
    packageLeg: packageDir ? "ran" : "not run (set FOLIO_FORMA_PACKAGE_DIR to an extracted Forma package)"
  });
  await writeFile(resolve(outputDir, "results.json"), `${JSON.stringify(results, null, 2)}\n`);
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
