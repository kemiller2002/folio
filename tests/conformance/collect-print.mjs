// GH-54: impure collectors for ULI-L12 print evidence. They gather browser
// print-media geometry and Chromium PDF extraction (Poppler, already required
// by the print experiments) and hand plain data to print-rules.mjs.

import { execFileSync } from "node:child_process";
import { flatText, parseBboxXhtml, resolvePageBox } from "./print-rules.mjs";

const SETTLE_TIMEOUT_MS = 15000;

/** In-page: read @page rules (through @layer/@media print), root vars and declared markers. */
function readPageContract() {
  const rules = [];
  let marginBoxes = false;
  const visit = list => {
    for (const rule of list) {
      if (rule.constructor.name === "CSSPageRule" || rule.type === 6) {
        const style = rule.style;
        const sides = ["top", "right", "bottom", "left"].map(side => style.getPropertyValue(`margin-${side}`).trim());
        const margin = style.getPropertyValue("margin").trim() || (sides.every(Boolean) ? sides.join(" ") : "");
        rules.push({ name: rule.selectorText ?? "", size: style.getPropertyValue("size").trim(), margin });
        if (/@(top|bottom|left|right)-/.test(rule.cssText)) marginBoxes = true;
        if (rule.cssRules?.length) marginBoxes = true;
      } else if (rule.cssRules && (!rule.media || [...rule.media].some(medium => medium === "print" || medium === "all") || rule.media.length === 0)) {
        visit(rule.cssRules);
      }
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      visit(sheet.cssRules);
    } catch {
      // Cross-origin sheets are not inspectable; they cannot declare Folio page rules here.
    }
  }
  if ([...document.querySelectorAll("style")].some(style => /@(top|bottom)-(left|center|right)/.test(style.textContent))) marginBoxes = true;
  const rootStyle = getComputedStyle(document.documentElement);
  const rootVars = {};
  for (const rule of rules) {
    for (const match of `${rule.size} ${rule.margin}`.matchAll(/var\(\s*(--[\w-]+)/g)) rootVars[match[1]] = rootStyle.getPropertyValue(match[1]).trim();
  }
  const marker = document.querySelector("[data-uli-running-text]") ?? document.documentElement;
  const blank = document.documentElement.getAttribute("data-uli-blank-pages") ?? "";
  return {
    rules,
    rootVars,
    marginBoxes,
    runningText: marker.getAttribute("data-uli-running-text") ?? "",
    allowedEmptyPages: blank.split(/[\s,]+/).filter(Boolean).map(Number),
  };
}

/** In-page: collect print-media layout measurements. */
function measurePrintLayout() {
  const blockish = new Set(["block", "list-item", "table-cell", "table-caption", "flex", "grid", "flow-root", "inline-block", "inline-flex", "inline-grid", "table"]);
  const pathOf = element => {
    const parts = [];
    for (let node = element; node && node.nodeType === 1 && node !== document.body; node = node.parentElement) {
      const tag = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`${tag}#${node.id}`);
        break;
      }
      const siblings = node.parentElement ? [...node.parentElement.children].filter(child => child.tagName === node.tagName) : [];
      parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${siblings.indexOf(node) + 1})` : tag);
    }
    return parts.join(" > ");
  };
  const containerOf = element => {
    for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
      const display = getComputedStyle(node).display;
      if (blockish.has(display)) return node;
    }
    return document.body;
  };
  const insideSvg = node => Boolean(node.parentElement?.closest("svg"));
  // Named page (CSS `page` is not inherited; the nearest declaring ancestor wins).
  const pageNameOf = element => {
    for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
      const name = getComputedStyle(node).page;
      if (name && name !== "auto") return name;
    }
    return "";
  };

  const boxes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent.trim() || insideSvg(node)) continue;
    const parent = node.parentElement;
    if (!parent || getComputedStyle(parent).visibility === "hidden") continue;
    range.selectNodeContents(node);
    const container = containerOf(parent);
    const fragments = [...container.getClientRects()].filter(rect => rect.width > 0 || rect.height > 0);
    for (const rect of range.getClientRects()) {
      if (rect.width <= 0 || rect.height <= 0) continue;
      // Multicolumn and paginated containers have one client rect per
      // fragment; judge each line against the fragment it actually sits in.
      const overlap = fragment => Math.min(rect.right, fragment.right) - Math.max(rect.left, fragment.left);
      const host = fragments
        .filter(fragment => rect.top >= fragment.top - 2 && rect.bottom <= fragment.bottom + 2)
        .sort((a, b) => overlap(b) - overlap(a))[0] ?? fragments[0];
      boxes.push({
        kind: "text",
        path: pathOf(parent),
        containerPath: pathOf(container),
        left: rect.left,
        right: rect.right,
        containerLeft: host ? host.left : null,
        containerRight: host ? host.right : null,
        pageName: pageNameOf(parent),
        sample: node.textContent.trim().slice(0, 48),
      });
    }
  }
  for (const element of document.body.querySelectorAll("img, video, canvas, iframe, object, embed, svg")) {
    if (element.tagName.toLowerCase() === "svg" && element.parentElement?.closest("svg")) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    boxes.push({ kind: "replaced", path: pathOf(element), containerPath: null, left: rect.left, right: rect.right, containerLeft: null, containerRight: null, pageName: pageNameOf(element), sample: element.getAttribute("aria-label") ?? element.tagName.toLowerCase() });
  }

  const clippers = [];
  for (const element of document.body.querySelectorAll("*")) {
    if (element.closest("svg") || ["img", "video", "canvas", "iframe", "object", "embed", "textarea", "select", "input"].includes(element.tagName.toLowerCase())) continue;
    const style = getComputedStyle(element);
    if (style.display === "none") continue;
    if (style.overflowX === "visible" && style.overflowY === "visible") continue;
    if (element.getAttribute("aria-hidden") === "true") continue;
    clippers.push({ path: pathOf(element), overflowX: style.overflowX, overflowY: style.overflowY, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight });
  }

  const regions = [...document.querySelectorAll("ef-print-header, ef-print-footer")].map(region => {
    const rect = region.getBoundingClientRect();
    const textEdges = element => {
      const inner = document.createRange();
      inner.selectNodeContents(element);
      const rects = [...inner.getClientRects()].filter(item => item.width > 0);
      return rects.length ? { textLeft: Math.min(...rects.map(item => item.left)), textRight: Math.max(...rects.map(item => item.right)) } : null;
    };
    return {
      tag: region.tagName.toLowerCase(),
      path: pathOf(region),
      text: region.innerText.replace(/\s+/g, " ").trim(),
      left: rect.left,
      right: rect.right,
      width: rect.width,
      height: rect.height,
      repeat: region.getAttribute("repeat"),
      direction: getComputedStyle(region).direction,
      slots: [...region.children]
        .filter(child => ["left", "center", "right"].includes(child.getAttribute("slot")))
        .map(child => ({ name: child.getAttribute("slot"), ...textEdges(child) }))
        .filter(slot => slot.textLeft !== undefined),
    };
  });

  const words = text => text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const tables = [...document.querySelectorAll("table")].filter(table => table.tHead).map(table => ({
    path: pathOf(table),
    theadDisplay: getComputedStyle(table.tHead).display,
    repeats: getComputedStyle(table.tHead).display === "table-header-group",
    headerCells: [...table.tHead.querySelectorAll("th, td")].map(cell => cell.innerText.replace(/\s+/g, " ").trim()).filter(Boolean),
    rows: [...table.tBodies].flatMap(body => [...body.rows]).map(row => [...row.cells].map(cell => cell.innerText.replace(/\s+/g, " ").trim()).filter(Boolean)).filter(cells => cells.length),
  }));

  // Single-token numeric-aligned cells (values and one-word labels). Multi-word
  // header labels may legitimately wrap between words.
  const numericCells = [...document.querySelectorAll("[data-align=\"number\"]")].filter(cell => /^\S+$/.test(cell.innerText.trim())).map(cell => {
    const cellRange = document.createRange();
    cellRange.selectNodeContents(cell);
    const tops = new Set([...cellRange.getClientRects()].filter(rect => rect.width > 0).map(rect => Math.round(rect.top)));
    return { path: pathOf(cell), lines: tops.size, text: cell.innerText.trim().slice(0, 24) };
  });

  const keeps = [];
  for (const element of document.body.querySelectorAll("*")) {
    const style = getComputedStyle(element);
    if (!["avoid", "avoid-page"].includes(style.breakAfter) || style.display === "none") continue;
    const next = element.nextElementSibling;
    const own = words(element.innerText ?? "");
    const following = next ? words(next.innerText ?? "") : [];
    if (!own.length || !following.length) continue;
    keeps.push({ path: pathOf(element), tail: own.slice(-5).join(" "), nextHead: following.slice(0, 5).join(" ") });
  }

  let reference = null;
  for (const referenceRoot of [document.querySelector("h1"), document.body].filter(Boolean)) {
  if (reference) break;
  const refWalker = document.createTreeWalker(referenceRoot, NodeFilter.SHOW_TEXT);
  for (let node = refWalker.nextNode(); node && !reference; node = refWalker.nextNode()) {
    if (insideSvg(node)) continue;
    const match = node.textContent.match(/[A-Za-z]{5,}/);
    if (!match) continue;
    const parent = node.parentElement;
    const style = getComputedStyle(parent);
    if (style.textTransform !== "none" || style.letterSpacing !== "normal" && style.letterSpacing !== "0px") continue;
    const before = node.textContent.slice(0, match.index);
    const after = node.textContent.slice(match.index + match[0].length);
    if (/\S$/.test(before) || /^\S/.test(after)) continue;
    const wordRange = document.createRange();
    wordRange.setStart(node, match.index);
    wordRange.setEnd(node, match.index + match[0].length);
    const rects = [...wordRange.getClientRects()];
    const following = after.match(/^\s+([^\s]+(?:\s+[^\s]+)?)/)?.[1] ?? null;
    if (rects.length === 1 && rects[0].width > 0) reference = { text: match[0], next: following, widthPx: rects[0].width };
  }
  }

  const forcedBreaks = [...document.body.querySelectorAll("*")].filter(element => {
    const style = getComputedStyle(element);
    return /^(page|left|right|recto|verso)$/.test(style.breakBefore) || /^(page|left|right|recto|verso)$/.test(style.breakAfter);
  }).length;

  return {
    viewportWidthPx: window.innerWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth,
    documentScrollHeight: document.documentElement.scrollHeight,
    boxes,
    clippers,
    regions,
    tables,
    numericCells,
    pageNumberMarkers: document.querySelectorAll("ef-print-page-number").length,
    keeps,
    reference,
    forcedBreaks,
    // One string per rendered text node, so CSS-generated separators (inline
    // lists, label/value pairs) never glue neighbouring words into one token.
    domText: (() => {
      const parts = [];
      const textWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = textWalker.nextNode(); node; node = textWalker.nextNode()) {
        if (!node.textContent.trim() || !node.parentElement) continue;
        const style = getComputedStyle(node.parentElement);
        if (style.visibility === "hidden") continue;
        const textRange = document.createRange();
        textRange.selectNodeContents(node);
        if (textRange.getClientRects().length) parts.push(node.textContent);
      }
      return parts.join(" ");
    })(),
  };
}

async function settle(page) {
  await page.waitForLoadState("load");
  await page.waitForLoadState("networkidle", { timeout: SETTLE_TIMEOUT_MS }).catch(() => {});
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    if (document.querySelector("ef-print-document")) await Promise.race([customElements.whenDefined("ef-print-document"), new Promise(resolve => setTimeout(resolve, 2000))]);
  });
}

function pdfExtract(pdfPath) {
  const bbox = execFileSync("pdftotext", ["-bbox", pdfPath, "-"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  const raw = execFileSync("pdftotext", ["-layout", pdfPath, "-"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  const reading = execFileSync("pdftotext", [pdfPath, "-"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  const pages = parseBboxXhtml(bbox);
  const pageTexts = raw.split("\f").slice(0, pages.length);
  // Layout text keeps table rows together; reading-order text keeps words that
  // hyphenate or wrap across a column boundary contiguous.
  return { pages, pageTexts, text: raw, readingText: reading };
}

/**
 * Collect both evidence legs for one print surface:
 *  (a) print-preview geometry with the viewport set to the intended page content box;
 *  (b) a Chromium PDF at the intended page size, extracted with Poppler.
 */
export async function collectPrintSurface(browser, { url, pdfPath }) {
  const context = await browser.newContext({ viewport: { width: 816, height: 1056 } });
  const page = await context.newPage();
  try {
    await page.emulateMedia({ media: "print" });
    const response = await page.goto(url);
    await settle(page);
    const contract = await page.evaluate(readPageContract);
    const defaultRule = contract.rules.filter(rule => !rule.name).reduce((merged, rule) => ({ ...merged, ...Object.fromEntries(Object.entries(rule).filter(([, value]) => value)) }), { name: "" });
    const pageBox = resolvePageBox(defaultRule, contract.rootVars);
    const namedBoxes = contract.rules
      .filter(rule => rule.name && !rule.name.startsWith(":") && rule.size)
      .map(rule => resolvePageBox({ ...defaultRule, ...rule, margin: rule.margin || defaultRule.margin }, contract.rootVars));
    if (pageBox) {
      await page.setViewportSize({ width: Math.max(1, Math.floor(pageBox.contentWidthPx)), height: Math.max(1, Math.floor(pageBox.contentHeightPx)) });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }
    const layout = await page.evaluate(measurePrintLayout);
    layout.pageBox = pageBox;
    layout.namedContentWidths = Object.fromEntries(namedBoxes.filter(Boolean).map(box => [box.name, box.contentWidthPx]));
    await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true, format: "Letter" });
    const pdf = pdfExtract(pdfPath);
    pdf.allowedEmptyPages = contract.allowedEmptyPages;
    return {
      httpStatus: response?.status() ?? null,
      contract,
      pageBox,
      pageBoxes: [pageBox, ...namedBoxes],
      layout,
      pdf,
      pageFlats: pdf.pageTexts.map(flatText),
      estimatedPages: pageBox ? layout.documentScrollHeight / pageBox.contentHeightPx + layout.forcedBreaks : 1,
    };
  } finally {
    await context.close();
  }
}
