// Studio diagram projection in print (EPC-DIAG-M1-001..007, #25).
// Proves one Forma-styled workflow composed with existing Folio primitives in
// color, grayscale and backgrounds-off PDF, for Letter and A4, without leaking
// source-only metadata and without shrinking text below the legibility floor.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { composeDocument, inspectProjection, minimumTextPt, planFit } from "../tools/diagram-projection.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const fixtureDir = resolve(root, "tests/fixtures/diagrams/purchase-request");
const outputDir = resolve(root, "test-results/diagram-projection");
const assets = { forma: "/tests/fixtures/diagrams/forma", folio: "" };

const manifest = JSON.parse(await readFile(resolve(fixtureDir, "projection.json"), "utf8"));
const html = await readFile(resolve(fixtureDir, "diagram.html"), "utf8");

// Values Studio marks source-only or export-only must never be printed.
const withheld = ["CC-7731-RESTRICTED", "Cost center", "cost-center", "tickets.example.com", "PR-1042", "audit"];
const nodeLabels = manifest.objects.filter((o) => o.role === "node").map((o) => o.label);
const laneNames = ["Requester", "Finance", "Procurement"];
const legendLabels = manifest.legend.map((l) => l.label);
const authoredFills = { highlight: [0xef, 0xe6, 0xfb], blocked: [0xfd, 0xe8, 0xd7], revise: [0xe3, 0xf4, 0xe1] };

const results = [];
const check = (name, fn) => {
  fn();
  results.push(name);
};

// ---------------------------------------------------------------------------
// Handoff inspection (EPC-DIAG-HANDOFF-*, EPC-DIAG-SEC-*)
// ---------------------------------------------------------------------------

check("the pinned Studio projection passes inspection", () => {
  assert.deepEqual(inspectProjection(manifest, html, { requiredRevision: manifest.source.revision }), []);
});

const digest = (text) => `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;

/** Applies a change and re-signs the digest, so only the content rules can reject it. */
const tampered = (mutateHtml) => {
  const nextHtml = mutateHtml(html);
  assert.notEqual(nextHtml, html, "the tampering pattern did not match the fixture");
  return inspectProjection({ ...manifest, content: { ...manifest.content, sha256: digest(nextHtml) } }, nextHtml).map((f) => f.code);
};

check("unsafe or tampered projections are refused", () => {
  assert.ok(tampered((h) => h.replace("</figure>", "<script>alert(1)</script></figure>")).includes("projection.markup"));
  assert.ok(tampered((h) => h.replace("<article ", "<article onmouseover=\"x()\" ")).includes("projection.markup"));
  assert.ok(tampered((h) => h.replace("</figure>", "<a href=\"javascript:alert(1)\">x</a></figure>")).includes("projection.markup"));
  assert.ok(tampered((h) => h.replace("</svg>", "<foreignObject><div>x</div></foreignObject></svg>")).includes("projection.markup"));
  assert.ok(tampered((h) => h.replace("</figure>", "<!-- cost center CC-7731 --></figure>")).includes("projection.markup"));
  assert.ok(tampered((h) => h.replace("<article ", "<article data-cost-center=\"CC\" ")).includes("projection.markup"));
  assert.ok(tampered((h) => h.replace("class=\"ef-diagram-node\"", "class=\"ef-diagram-node studio-selection\"")).includes("projection.editor-state"));
  assert.ok(tampered((h) => h.replace("--ef-diagram-fill: #efe6fb;", "background: url(https://example.com/x);")).includes("projection.style"));
  assert.ok(inspectProjection(manifest, html + " ", {}).some((f) => f.code === "projection.digest"));
  assert.ok(inspectProjection(manifest, html, { requiredRevision: "sha256:0000" }).some((f) => f.code === "projection.stale"));
  assert.ok(inspectProjection({ ...manifest, scope: "agent-export" }, html).some((f) => f.code === "projection.scope"));
  assert.ok(inspectProjection({ ...manifest, status: "invalid-diagnostic" }, html).some((f) => f.code === "projection.status"));
  assert.ok(inspectProjection({ ...manifest, projectionVersion: "2.0.0" }, html).some((f) => f.code === "projection.version"));
});

check("the pinned projection itself carries no withheld metadata", () => {
  const text = html + JSON.stringify(manifest);
  for (const secret of withheld) assert.ok(!text.includes(secret), `projection contains ${secret}`);
});

// ---------------------------------------------------------------------------
// Fit planning (EPC-DIAG-021, EPC-DIAG-SCALE-001..007)
// ---------------------------------------------------------------------------

const plans = {
  letter: planFit(manifest, "letter-portrait"),
  a4: planFit(manifest, "a4-portrait"),
  letterLandscape: planFit(manifest, "letter-landscape"),
  portraitOnly: planFit(manifest, "letter-portrait", { allowRotation: false })
};

check("portrait requests rotate instead of shrinking text below the floor", () => {
  assert.equal(plans.letter.strategy, "rotated-fit");
  assert.equal(plans.letter.profile, "letter-landscape");
  assert.equal(plans.a4.profile, "a4-landscape");
  assert.match(plans.letter.reasons[0], /below the 7pt minimum/);
  assert.equal(plans.portraitOnly.strategy, "tile-required");
  assert.throws(() => composeDocument({ manifest, html, plan: plans.portraitOnly, assets }), /Cannot compose/);
  for (const plan of [plans.letter, plans.a4, plans.letterLandscape]) {
    assert.ok(plan.textPt >= minimumTextPt, `${plan.label} text ${plan.textPt}pt`);
    assert.ok(plan.scale < 1, "the wide workflow needs fit scaling");
  }
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function mimeType(path) {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".js") || path.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  return "application/octet-stream";
}

async function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const filePath = resolve(root, decodeURIComponent(url.pathname).replace(/^\/+/, ""));
      if (filePath !== root && !filePath.startsWith(root + sep)) throw new Error("outside root");
      if (!(await stat(filePath)).isFile()) throw new Error("not a file");
      response.writeHead(200, { "content-type": mimeType(filePath) });
      response.end(await readFile(filePath));
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(0, "127.0.0.1", ok);
  });
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

const pdfText = (path) => execFileSync("pdftotext", [path, "-"], { encoding: "utf8" }).replace(/\s+/g, " ").trim();
const pdfInfo = (path) => {
  const info = execFileSync("pdfinfo", [path], { encoding: "utf8" });
  const [, width, height] = info.match(/^Page size:\s+([\d.]+) x ([\d.]+) pts/m);
  return { pages: Number(info.match(/^Pages:\s+(\d+)/m)[1]), width: Number(width), height: Number(height) };
};
const pdfMetadata = (path) => execFileSync("pdfinfo", ["-meta", path], { encoding: "utf8" }) + execFileSync("pdfinfo", [path], { encoding: "utf8" });

/** Rasterizes page 1 and returns RGB pixel triples (PPM is trivial to parse). */
const pixels = (path) => {
  const ppm = execFileSync("pdftoppm", ["-r", "40", "-f", "1", "-l", "1", path]);
  const header = ppm.subarray(0, 64).toString("latin1").split(/\s+/);
  const [width, height] = [Number(header[1]), Number(header[2])];
  const offset = ppm.length - width * height * 3;
  return Array.from({ length: width * height }, (_, i) => [ppm[offset + i * 3], ppm[offset + i * 3 + 1], ppm[offset + i * 3 + 2]]);
};
const near = (a, b, tolerance = 6) => a.every((v, i) => Math.abs(v - b[i]) <= tolerance);
const countNear = (pxs, color) => pxs.filter((p) => near(p, color)).length;
// Relative luminance (Rec. 601 weights) is what survives grayscale conversion.
const luminance = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
const darkCount = (pxs) => pxs.filter((p) => luminance(p) < 90).length;
const maxChroma = (pxs) => pxs.reduce((max, [r, g, b]) => Math.max(max, Math.max(r, g, b) - Math.min(r, g, b)), 0);

async function render(browser, baseUrl, name, plan, { printBackground = true, colorMode = "color" } = {}) {
  const documentPath = resolve(outputDir, `${name}.html`);
  await writeFile(documentPath, composeDocument({ manifest, html, plan, assets, colorMode }));
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.emulateMedia({ media: "print" });
  await page.goto(`${baseUrl}/test-results/diagram-projection/${name}.html`);
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await customElements.whenDefined("ef-print-figure");
    if (document.fonts?.ready) await document.fonts.ready;
  });
  const dom = await page.evaluate(() => {
    const canvas = document.querySelector(".ef-diagram__canvas");
    const viewport = document.querySelector(".ef-diagram__viewport");
    const zoom = Number(getComputedStyle(viewport).zoom || 1);
    const frame = canvas.getBoundingClientRect();
    const items = [...document.querySelectorAll(".ef-diagram-node, .ef-diagram-group, .ef-diagram-connector__label")];
    const outside = items
      .map((el) => ({ name: el.textContent.trim().slice(0, 40), r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.left < frame.left - 1 || r.right > frame.right + 1 || r.top < frame.top - 1 || r.bottom > frame.bottom + 1)
      .map(({ name }) => name);
    const clipped = [...document.querySelectorAll(".ef-diagram-node")]
      .filter((el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)
      .map((el) => el.textContent.trim().slice(0, 40));
    const textElements = [...canvas.querySelectorAll("*")].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    const smallestPx = Math.min(...textElements.map((el) => parseFloat(getComputedStyle(el).fontSize)));
    const strokePx = Math.min(...[...document.querySelectorAll(".ef-diagram-connector")].map((el) => parseFloat(getComputedStyle(el).strokeWidth)));
    return {
      zoom,
      outside,
      clipped,
      smallestTextPt: smallestPx * zoom * 0.75,
      strokePt: strokePx * zoom * 0.75,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      nodeCount: document.querySelectorAll(".ef-diagram-node").length,
      html: document.documentElement.outerHTML
    };
  });
  const pdf = resolve(outputDir, `${name}.pdf`);
  await page.pdf({ path: pdf, preferCSSPageSize: true, printBackground, displayHeaderFooter: false });
  await page.close();
  return { pdf, dom };
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
const { server, baseUrl } = await startServer();
const browser = await chromium.launch();
const rendererVersion = browser.version();
try {
  const letter = await render(browser, baseUrl, "workflow-letter-color", plans.letter);
  const a4 = await render(browser, baseUrl, "workflow-a4-color", plans.a4);
  const noBackgrounds = await render(browser, baseUrl, "workflow-letter-backgrounds-off", plans.letter, { printBackground: false, colorMode: "backgrounds-off" });
  // Grayscale is what a grayscale printer produces from the color PDF: a device
  // color conversion that keeps text and vectors (EPC-COLOR-026). A CSS filter
  // would rasterize the diagram and lose selectable text.
  const grayscalePdf = resolve(outputDir, "workflow-letter-grayscale.pdf");
  execFileSync("gs", ["-q", "-dNOPAUSE", "-dBATCH", "-dSAFER", "-sDEVICE=pdfwrite", "-sColorConversionStrategy=Gray", "-dProcessColorModel=/DeviceGray", `-sOutputFile=${grayscalePdf}`, letter.pdf]);

  check("the DOM keeps every item inside the canvas, unclipped and legible after fitting", () => {
    for (const { dom } of [letter, a4, noBackgrounds]) {
      assert.equal(dom.nodeCount, nodeLabels.length);
      assert.deepEqual(dom.outside, [], "items outside the diagram bounds");
      assert.deepEqual(dom.clipped, [], "clipped node content");
      assert.equal(dom.overflow, false, "page-level overflow");
      assert.ok(dom.smallestTextPt >= minimumTextPt, `smallest text ${dom.smallestTextPt}pt`);
      assert.ok(dom.strokePt >= 0.5, `connector stroke ${dom.strokePt}pt`);
    }
    assert.equal(letter.dom.zoom, plans.letter.scale);
  });

  check("composed documents contain no withheld metadata", () => {
    for (const { dom } of [letter, a4, noBackgrounds]) {
      for (const secret of withheld) assert.ok(!dom.html.includes(secret), `document contains ${secret}`);
    }
  });

  check("Letter and A4 print landscape, one diagram page plus the index", () => {
    const l = pdfInfo(letter.pdf);
    const a = pdfInfo(a4.pdf);
    assert.ok(Math.abs(l.width - 792) < 2 && Math.abs(l.height - 612) < 2, `Letter landscape, got ${l.width}x${l.height}`);
    assert.ok(Math.abs(a.width - 842) < 3 && Math.abs(a.height - 595) < 3, `A4 landscape, got ${a.width}x${a.height}`);
    assert.ok(l.pages <= 4 && a.pages <= 4, `unexpected page counts ${l.pages}/${a.pages}`);
    // The whole canvas must land on page 1: every node label, lane and rendered
    // metadata value (including the bottom lane's last row) is on the first page.
    const onPage = (pdf, n) => execFileSync("pdftotext", ["-f", String(n), "-l", String(n), pdf, "-"], { encoding: "utf8" }).replace(/\s+/g, " ");
    const canvasWords = [
      ...nodeLabels.flatMap((label) => label.split(" ")),
      ...laneNames,
      ...manifest.objects.flatMap((o) => (o.renderedMetadata ?? []).flatMap((v) => (v.text ?? "").split(" ")))
    ].filter((word) => word.length > 2);
    for (const pdf of [letter.pdf, a4.pdf]) {
      const first = onPage(pdf, 1);
      for (const word of canvasWords) assert.ok(first.includes(word), `${pdf}: '${word}' is not on the diagram page`);
      assert.ok(!onPage(pdf, 2).includes("Fulfilment Phase") , "canvas split across pages");
    }
  });

  const texts = {
    color: pdfText(letter.pdf),
    a4: pdfText(a4.pdf),
    backgroundsOff: pdfText(noBackgrounds.pdf),
    grayscale: pdfText(grayscalePdf).normalize("NFKC")
  };

  check("labels, relationships, lanes, legend and metadata survive every output mode", () => {
    for (const [mode, text] of Object.entries(texts)) {
      for (const label of nodeLabels) assert.ok(text.includes(label), `${mode} lacks node ${label}`);
      for (const lane of laneNames) assert.ok(text.includes(lane), `${mode} lacks lane ${lane}`);
      for (const legend of legendLabels) assert.ok(text.includes(legend), `${mode} lacks legend ${legend}`);
      for (const relation of manifest.relationships) assert.ok(text.includes(relation), `${mode} lacks relationship: ${relation}`);
      for (const value of ["Blocked", "In progress", "derived from lane", "dashed line", "dotted line"]) assert.ok(text.includes(value), `${mode} lacks ${value}`);
      for (const secret of withheld) assert.ok(!text.includes(secret), `${mode} PDF text leaks ${secret}`);
    }
    // The provenance note states the color mode on purpose; everything else must match.
    const withoutMode = (text) => text.replace(/Color mode \S+$/, "");
    assert.equal(withoutMode(texts.backgroundsOff), withoutMode(texts.color), "backgrounds-off changed extracted text");
    // Ghostscript re-encodes fonts (ligatures such as "fi") and can change extraction
    // order inside tables, so grayscale is compared as a normalized multiset of words.
    const words = (text) => text.normalize("NFKC").split(" ").filter(Boolean).sort();
    assert.deepEqual(words(texts.grayscale), words(texts.color), "grayscale conversion changed extracted text");
  });

  check("PDF document metadata carries no withheld values", () => {
    for (const pdf of [letter.pdf, a4.pdf, noBackgrounds.pdf, grayscalePdf]) {
      const meta = pdfMetadata(pdf);
      for (const secret of withheld) assert.ok(!meta.includes(secret), `${pdf} metadata leaks ${secret}`);
    }
  });

  const colorPixels = pixels(letter.pdf);
  const offPixels = pixels(noBackgrounds.pdf);
  const grayPixels = pixels(grayscalePdf);

  check("color PDF preserves authored fills; backgrounds-off drops fills but keeps boundaries", () => {
    for (const [name, rgb] of Object.entries(authoredFills)) {
      assert.ok(countNear(colorPixels, rgb) > 20, `color PDF lacks authored ${name} fill`);
      assert.ok(countNear(offPixels, rgb) === 0, `backgrounds-off PDF still paints ${name} fill`);
    }
    const colorDark = darkCount(colorPixels);
    const offDark = darkCount(offPixels);
    assert.ok(offDark > 0.6 * colorDark, `boundaries and text lost without backgrounds (${offDark} vs ${colorDark} dark pixels)`);
  });

  check("grayscale PDF has no chroma and keeps the same boundaries and text", () => {
    assert.ok(maxChroma(grayPixels) <= 3, `grayscale PDF still has color (chroma ${maxChroma(grayPixels)})`);
    // Boundaries, markers and text must not be lost; converted accents may add dark pixels.
    assert.ok(darkCount(grayPixels) >= 0.9 * darkCount(colorPixels), `boundaries or text lost in grayscale (${darkCount(grayPixels)} vs ${darkCount(colorPixels)})`);
  });

  console.log(JSON.stringify({
    status: "passed",
    rendererVersion,
    checks: results,
    plans: { letter: plans.letter, a4: plans.a4 },
    smallestTextPt: { letter: letter.dom.smallestTextPt, a4: a4.dom.smallestTextPt },
    pages: { letter: pdfInfo(letter.pdf).pages, a4: pdfInfo(a4.pdf).pages },
    source: { diagram: manifest.source.diagramId, revision: manifest.source.revision }
  }, null, 2));
} finally {
  await browser.close();
  await new Promise((ok) => server.close(ok));
}
