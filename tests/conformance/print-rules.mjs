// GH-54: pure ULI-L12 print/paged-media checks.
//
// Each exported check maps already-collected measurements (print-media layout
// geometry and Chromium PDF extraction) to findings. Nothing here touches a
// browser, the file system or the clock, so every rule is unit-testable with
// synthetic measurements (tests/ui-conformance-rules.test.mjs).

import { STATUS, finding } from "./uli.mjs";

export const CSS_PX_PER_IN = 96;
export const PT_PER_IN = 72;

const NAMED_SIZES_IN = Object.freeze({
  letter: [8.5, 11],
  legal: [8.5, 14],
  ledger: [11, 17],
  tabloid: [11, 17],
  a3: [297 / 25.4, 420 / 25.4],
  a4: [210 / 25.4, 297 / 25.4],
  a5: [148 / 25.4, 210 / 25.4],
  b4: [250 / 25.4, 353 / 25.4],
  b5: [176 / 25.4, 250 / 25.4],
});

const UNIT_IN = Object.freeze({ in: 1, mm: 1 / 25.4, cm: 1 / 2.54, pt: 1 / 72, pc: 1 / 6, px: 1 / 96, q: 1 / 101.6 });

/** Parse one absolute CSS length into inches; null when not absolute. */
export function parseLengthIn(value) {
  const match = String(value ?? "").trim().toLowerCase().match(/^(-?\d*\.?\d+)(in|mm|cm|pt|pc|px|q)?$/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!match[2]) return amount === 0 ? 0 : null;
  return amount * UNIT_IN[match[2]];
}

/** Parse an @page `size` value into { widthIn, heightIn } or null. */
export function parsePageSize(value) {
  const tokens = String(value ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length || tokens[0] === "auto") return null;
  let orientation = null;
  let dims = null;
  const lengths = [];
  for (const token of tokens) {
    if (token === "portrait" || token === "landscape") orientation = token;
    else if (NAMED_SIZES_IN[token]) dims = [...NAMED_SIZES_IN[token]];
    else {
      const length = parseLengthIn(token);
      if (length === null) return null;
      lengths.push(length);
    }
  }
  if (lengths.length === 1) dims = [lengths[0], lengths[0]];
  if (lengths.length === 2) dims = lengths;
  if (!dims) dims = [...NAMED_SIZES_IN.letter];
  if (orientation === "landscape" && dims[0] < dims[1]) dims = [dims[1], dims[0]];
  if (orientation === "portrait" && dims[0] > dims[1]) dims = [dims[1], dims[0]];
  return { widthIn: dims[0], heightIn: dims[1] };
}

/** Parse a `margin` shorthand into { top, right, bottom, left } inches or null. */
export function parseMarginIn(value) {
  const parts = String(value ?? "").trim().split(/\s+/).filter(Boolean).map(parseLengthIn);
  if (!parts.length || parts.some(part => part === null)) return null;
  const [top, right = top, bottom = top, left = right] = parts;
  return { top, right, bottom, left };
}

/**
 * Resolve the intended page box from the collected @page declarations.
 * Values may reference root custom properties (Folio's public
 * --ef-print-page-size / --ef-print-page-margin contract).
 */
export function resolvePageBox(pageRule, rootVars) {
  const resolveVars = text => String(text ?? "").replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (_, name, fallback) => (rootVars?.[name] ?? fallback ?? "").trim());
  const sizeText = resolveVars(pageRule?.size ?? "");
  const marginText = resolveVars(pageRule?.margin ?? "");
  // Undeclared size/margin fall back to what the PDF leg requests from Chromium:
  // page.pdf({ format: "Letter" }) with no page margins.
  const size = parsePageSize(sizeText) ?? (sizeText ? null : parsePageSize("letter"));
  const margin = parseMarginIn(marginText) ?? (marginText ? null : { top: 0, right: 0, bottom: 0, left: 0 });
  if (!size || !margin) return null;
  const contentWidthIn = size.widthIn - margin.left - margin.right;
  const contentHeightIn = size.heightIn - margin.top - margin.bottom;
  return {
    name: pageRule?.name ?? "",
    sizeText: sizeText || "auto(letter)",
    marginText: marginText || "undeclared(0)",
    marginDeclared: Boolean(marginText),
    widthPt: size.widthIn * PT_PER_IN,
    heightPt: size.heightIn * PT_PER_IN,
    marginPt: Object.fromEntries(Object.entries(margin).map(([side, inches]) => [side, inches * PT_PER_IN])),
    contentWidthPx: contentWidthIn * CSS_PX_PER_IN,
    contentHeightPx: contentHeightIn * CSS_PX_PER_IN,
  };
}

/**
 * Comparable text: NFKC, case-folded, without whitespace, hyphens, soft
 * hyphens or bidi controls (pdftotext wraps mixed-direction runs in
 * embedding/override marks).
 */
export function flatText(text) {
  return String(text ?? "").normalize("NFKC").toLowerCase().replace(/[\s\u00ad\u2010\u2011\u200e\u200f\u202a-\u202e\u2066-\u2069-]+/g, "");
}

const RTL = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc]/;
export const isRtlText = text => RTL.test(text);

/** Parse `pdftotext -bbox` XHTML into pages of words with PDF-point boxes. */
export function parseBboxXhtml(xhtml) {
  const pages = [];
  for (const line of String(xhtml).split("\n")) {
    const page = line.match(/<page width="([\d.]+)" height="([\d.]+)"/);
    if (page) {
      pages.push({ widthPt: Number(page[1]), heightPt: Number(page[2]), words: [] });
      continue;
    }
    const word = line.match(/<word xMin="(-?[\d.]+)" yMin="(-?[\d.]+)" xMax="(-?[\d.]+)" yMax="(-?[\d.]+)">(.*)<\/word>/);
    if (word && pages.length) {
      const decoded = word[5].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&amp;/g, "&");
      pages.at(-1).words.push({ xMin: Number(word[1]), yMin: Number(word[2]), xMax: Number(word[3]), yMax: Number(word[4]), text: decoded });
    }
  }
  return pages;
}

const fmt = value => Math.round(value * 100) / 100;
const pageLabel = index => `page ${index + 1}`;

// ---------------------------------------------------------------------------
// (a) Browser print preview geometry (page.emulateMedia({ media: "print" })).
// ---------------------------------------------------------------------------

/**
 * ULI-L12/page-box: rendered text lines and replaced elements stay inside the
 * declared page content box. Chromium shrinks the whole document to fit when
 * anything overflows horizontally, so a single offender degrades every page.
 */
export function checkPageBoxContainment({ surface, state, layout, tolerancePx = 1 }) {
  const location = `${surface} (print preview)`;
  if (!layout?.pageBox) {
    return [finding({ rule: "ULI-L12/page-box", status: STATUS.UNKNOWN, location, state, evidence: "Intended page box could not be resolved from @page declarations." })];
  }
  const width = layout.viewportWidthPx;
  // Content on a named page (CSS `page`) is judged against that page's box.
  const widthFor = box => (box.pageName && layout.namedContentWidths?.[box.pageName]) || width;
  const offenders = layout.boxes.filter(box => box.right > widthFor(box) + tolerancePx || box.left < -tolerancePx);
  const namedOnly = layout.boxes.filter(box => box.pageName && layout.namedContentWidths?.[box.pageName]);
  const widestNamed = Math.max(width, ...namedOnly.map(box => widthFor(box)));
  const documentOverflow = layout.documentScrollWidth - layout.documentClientWidth;
  const measured = {
    contentWidthPx: fmt(width),
    documentScrollWidthPx: layout.documentScrollWidth,
    documentClientWidthPx: layout.documentClientWidth,
    inspectedBoxes: layout.boxes.length,
    offenders: offenders.slice(0, 12).map(box => ({ path: box.path, kind: box.kind, left: fmt(box.left), right: fmt(box.right), sample: box.sample })),
    offenderCount: offenders.length,
  };
  if (!layout.boxes.length) {
    return [finding({ rule: "ULI-L12/page-box", status: STATUS.UNKNOWN, location, state, evidence: "No rendered text or replaced content was measured.", measured, tolerance: { px: tolerancePx } })];
  }
  const fail = offenders.length > 0 || (documentOverflow > tolerancePx && layout.documentScrollWidth > widestNamed + tolerancePx);
  return [finding({
    rule: "ULI-L12/page-box",
    status: fail ? STATUS.FAIL : STATUS.PASS,
    location,
    state,
    evidence: fail
      ? `${offenders.length} rendered box(es) leave the ${fmt(width)}px page content box; document scrollWidth ${layout.documentScrollWidth}px > clientWidth ${layout.documentClientWidth}px.`
      : `All ${layout.boxes.length} rendered text/replaced boxes are inside the ${fmt(width)}px page content box.`,
    measured,
    tolerance: { px: tolerancePx },
  })];
}

/**
 * ULI-L12/spill: text never escapes its own block container (which would
 * overlap a neighbouring column, sidebar rail, grid track or table cell).
 */
export function checkOwnBoxSpill({ surface, state, layout, tolerancePx = 1 }) {
  const location = `${surface} (print preview)`;
  const spills = (layout?.boxes ?? []).filter(box => box.kind === "text" && box.containerRight !== null && (box.right > box.containerRight + tolerancePx || box.left < box.containerLeft - tolerancePx));
  if (!layout?.boxes?.length) {
    return [finding({ rule: "ULI-L12/spill", status: STATUS.UNKNOWN, location, state, evidence: "No rendered text was measured." })];
  }
  return [finding({
    rule: "ULI-L12/spill",
    status: spills.length ? STATUS.FAIL : STATUS.PASS,
    location,
    state,
    evidence: spills.length
      ? `${spills.length} text line(s) overflow their block container (overlap with neighbouring flow).`
      : "No text line overflows its block container.",
    measured: { spillCount: spills.length, spills: spills.slice(0, 12).map(box => ({ path: box.path, container: box.containerPath, overflowPx: fmt(Math.max(box.right - box.containerRight, box.containerLeft - box.left)), sample: box.sample })) },
    tolerance: { px: tolerancePx },
  })];
}

/** ULI-L12/clipping: no print container hides content behind overflow clipping. */
export function checkClippingContainers({ surface, state, layout, tolerancePx = 1 }) {
  const location = `${surface} (print preview)`;
  const clipped = (layout?.clippers ?? []).filter(item => item.scrollWidth > item.clientWidth + tolerancePx || item.scrollHeight > item.clientHeight + tolerancePx);
  if (!layout) return [finding({ rule: "ULI-L12/clipping", status: STATUS.UNKNOWN, location, state, evidence: "No layout measured." })];
  if (!layout.clippers.length) {
    return [finding({ rule: "ULI-L12/clipping", status: STATUS.NOT_APPLICABLE, location, state, evidence: "No element establishes overflow clipping under print media." })];
  }
  return [finding({
    rule: "ULI-L12/clipping",
    status: clipped.length ? STATUS.FAIL : STATUS.PASS,
    location,
    state,
    evidence: clipped.length
      ? `${clipped.length} clipping container(s) hide content on paper (no scrollbars in print).`
      : `${layout.clippers.length} clipping container(s) fit their content.`,
    measured: { clippers: layout.clippers.length, clipped: clipped.slice(0, 12) },
    tolerance: { px: tolerancePx },
  })];
}

/**
 * ULI-L12/header-footer: declared Folio headers/footers are present with text
 * and their named slots sit at the edge they name (left/center/right are
 * physical positions, including in right-to-left documents).
 */
export function checkHeadersFooters({ surface, state, layout, tolerancePx = 2 }) {
  const location = `${surface} (print preview)`;
  const regions = layout?.regions ?? [];
  if (!regions.length) {
    return [finding({ rule: "ULI-L12/header-footer", status: STATUS.NOT_APPLICABLE, location, state, evidence: "No ef-print-header or ef-print-footer is declared." })];
  }
  return regions.flatMap(region => {
    const where = `${location} ${region.path}`;
    const results = [];
    const visible = region.width > 0 && region.height > 0 && region.text.length > 0;
    results.push(finding({
      rule: "ULI-L12/header-footer",
      status: visible ? STATUS.PASS : STATUS.FAIL,
      location: where,
      state,
      evidence: visible ? `${region.tag} renders "${region.text.slice(0, 60)}".` : `${region.tag} is declared but renders no visible text.`,
      measured: { width: fmt(region.width), height: fmt(region.height), textLength: region.text.length },
    }));
    for (const slot of region.slots) {
      const expected = slot.name === "left" ? region.left : slot.name === "right" ? region.right : (region.left + region.right) / 2;
      const actual = slot.name === "left" ? slot.textLeft : slot.name === "right" ? slot.textRight : (slot.textLeft + slot.textRight) / 2;
      const delta = Math.abs(actual - expected);
      results.push(finding({
        rule: "ULI-L12/header-footer-slot",
        status: delta <= tolerancePx ? STATUS.PASS : STATUS.FAIL,
        location: `${where} [slot="${slot.name}"]`,
        state: `${state}; dir=${region.direction}`,
        evidence: delta <= tolerancePx
          ? `Slot "${slot.name}" text is at the ${slot.name} edge of the ${region.tag}.`
          : `Slot "${slot.name}" text edge is ${fmt(delta)}px from the ${region.tag}'s ${slot.name} ${slot.name === "center" ? "axis" : "edge"}.`,
        measured: { expectedPx: fmt(expected), actualPx: fmt(actual), deltaPx: fmt(delta) },
        tolerance: { px: tolerancePx },
      }));
    }
    if (region.repeat === "page") {
      results.push(finding({
        rule: "ULI-L12/header-footer-repeat",
        status: STATUS.UNKNOWN,
        location: where,
        state,
        evidence: "repeat=\"page\" is running-content intent; P0 core CSS deliberately does not repeat in-flow headers/footers and no P1/P2 renderer adapter was exercised.",
      }));
    }
    return results;
  });
}

// ---------------------------------------------------------------------------
// (b) Chromium PDF output (page.pdf({ preferCSSPageSize: true })).
// ---------------------------------------------------------------------------

/** ULI-L12/pdf-pages: sane page count, intended page size, text on every page. */
export function checkPdfPages({ surface, state, pdf, pageBoxes, estimatedPages, sizeTolerancePt = 1.5 }) {
  const location = `${surface} (PDF)`;
  if (!pdf?.pages?.length) {
    return [finding({ rule: "ULI-L12/pdf-pages", status: STATUS.UNKNOWN, location, state, evidence: "No PDF pages were extracted." })];
  }
  const results = [];
  const pageCount = pdf.pages.length;
  const ceiling = Math.max(2, Math.ceil(estimatedPages * 2) + 2);
  results.push(finding({
    rule: "ULI-L12/pdf-page-count",
    status: pageCount >= 1 && pageCount <= ceiling ? STATUS.PASS : STATUS.FAIL,
    location,
    state,
    evidence: `${pageCount} page(s); print-media layout estimates about ${fmt(estimatedPages)}.`,
    measured: { pages: pageCount, estimatedPages: fmt(estimatedPages) },
    tolerance: { maxPages: ceiling },
  }));

  const intended = pageBoxes.filter(Boolean);
  if (!intended.length) {
    results.push(finding({ rule: "ULI-L12/pdf-page-size", status: STATUS.UNKNOWN, location, state, evidence: "Intended page size could not be resolved." }));
  } else {
    const mismatched = pdf.pages
      .map((page, index) => ({ index, widthPt: page.widthPt, heightPt: page.heightPt }))
      .filter(page => !intended.some(box => Math.abs(box.widthPt - page.widthPt) <= sizeTolerancePt && Math.abs(box.heightPt - page.heightPt) <= sizeTolerancePt));
    results.push(finding({
      rule: "ULI-L12/pdf-page-size",
      status: mismatched.length ? STATUS.FAIL : STATUS.PASS,
      location,
      state,
      evidence: mismatched.length
        ? `${mismatched.length} page(s) do not match any declared page size (${intended.map(box => box.sizeText).join(", ")}).`
        : `Every page matches a declared page size (${[...new Set(intended.map(box => box.sizeText))].join(", ")}).`,
      measured: { declared: intended.map(box => ({ name: box.name, widthPt: fmt(box.widthPt), heightPt: fmt(box.heightPt) })), mismatched: mismatched.slice(0, 8) },
      tolerance: { pt: sizeTolerancePt },
    }));
  }

  const empty = pdf.pages.map((page, index) => ({ index, words: page.words.length })).filter(page => page.words === 0);
  const allowedEmpty = new Set(pdf.allowedEmptyPages ?? []);
  const unexpectedEmpty = empty.filter(page => !allowedEmpty.has(page.index + 1));
  results.push(finding({
    rule: "ULI-L12/pdf-text",
    status: unexpectedEmpty.length ? STATUS.FAIL : STATUS.PASS,
    location,
    state,
    evidence: unexpectedEmpty.length
      ? `${unexpectedEmpty.length} page(s) have no extractable text (${unexpectedEmpty.map(page => pageLabel(page.index)).join(", ")}).`
      : `Text is extractable on all ${pageCount} page(s).`,
    measured: { wordsPerPage: pdf.pages.map(page => page.words.length) },
  }));
  return results;
}

/**
 * ULI-L12/pdf-clip: no extracted word lies beyond a physical page edge, and
 * body words stay in the content box unless running margin-box content is
 * declared for that page area.
 */
export function checkPdfWordPlacement({ surface, state, pdf, pageBox, marginBoxesDeclared, tolerancePt = 1.5 }) {
  const location = `${surface} (PDF)`;
  if (!pdf?.pages?.length) return [finding({ rule: "ULI-L12/pdf-clip", status: STATUS.UNKNOWN, location, state, evidence: "No PDF words extracted." })];
  const offPage = [];
  const inMargin = [];
  for (const [index, page] of pdf.pages.entries()) {
    for (const word of page.words) {
      if (word.xMin < -tolerancePt || word.xMax > page.widthPt + tolerancePt || word.yMin < -tolerancePt || word.yMax > page.heightPt + tolerancePt) {
        offPage.push({ page: index + 1, ...word });
      } else if (pageBox && Math.abs(page.widthPt - pageBox.widthPt) <= tolerancePt && Math.abs(page.heightPt - pageBox.heightPt) <= tolerancePt) {
        const { left, right } = pageBox.marginPt;
        if (word.xMin < left - tolerancePt || word.xMax > page.widthPt - right + tolerancePt) inMargin.push({ page: index + 1, ...word });
      }
    }
  }
  const results = [finding({
    rule: "ULI-L12/pdf-clip",
    status: offPage.length ? STATUS.FAIL : STATUS.PASS,
    location,
    state,
    evidence: offPage.length ? `${offPage.length} word(s) are positioned beyond a page edge and are clipped.` : "No extracted word lies beyond a page edge.",
    measured: { offPage: offPage.slice(0, 10).map(word => ({ page: word.page, xMin: fmt(word.xMin), xMax: fmt(word.xMax), text: word.text.slice(0, 40) })), offPageCount: offPage.length },
    tolerance: { pt: tolerancePt },
  })];
  if (!pageBox) {
    results.push(finding({ rule: "ULI-L12/pdf-margins", status: STATUS.UNKNOWN, location, state, evidence: "Intended margins could not be resolved." }));
  } else if (!pageBox.marginDeclared) {
    results.push(finding({ rule: "ULI-L12/pdf-margins", status: STATUS.UNKNOWN, location, state, evidence: "The surface declares no @page margin; the consuming renderer supplies margins, so margin intrusion cannot be judged.", measured: { marginWords: inMargin.length } }));
  } else if (marginBoxesDeclared) {
    results.push(finding({ rule: "ULI-L12/pdf-margins", status: STATUS.NOT_APPLICABLE, location, state, evidence: "The document declares @page margin boxes or several page boxes (named pages); a single margin envelope does not apply.", measured: { marginWords: inMargin.length } }));
  } else {
    results.push(finding({
      rule: "ULI-L12/pdf-margins",
      status: inMargin.length ? STATUS.FAIL : STATUS.PASS,
      location,
      state,
      evidence: inMargin.length ? `${inMargin.length} word(s) intrude into the declared horizontal page margins.` : "All words stay within the declared horizontal margins.",
      measured: { inMargin: inMargin.slice(0, 10).map(word => ({ page: word.page, xMin: fmt(word.xMin), xMax: fmt(word.xMax), text: word.text.slice(0, 40) })), inMarginCount: inMargin.length, marginPt: pageBox.marginPt },
      tolerance: { pt: tolerancePt },
    }));
  }
  return results;
}

/**
 * ULI-L12/pdf-scale: the PDF keeps the authored type scale. A reference word
 * measured under print media must have the same advance width in the PDF;
 * Chromium shrink-to-fit after horizontal overflow fails this check.
 */
export function checkPdfScale({ surface, state, reference, pdf, tolerance = 0.03 }) {
  const location = `${surface} (PDF)`;
  if (!reference?.text || !reference.widthPx) {
    return [finding({ rule: "ULI-L12/pdf-scale", status: STATUS.UNKNOWN, location, state, evidence: "No reference word was measured under print media." })];
  }
  const wanted = reference.text.normalize("NFKC");
  const next = reference.next ? flatText(reference.next) : null;
  // Disambiguate by the following word so a smaller running-header copy of the
  // same word is not mistaken for the reference occurrence.
  const following = (words, index) => flatText(words.slice(index + 1, index + 4).map(word => word.text).join(""));
  const candidates = (pdf?.pages ?? []).flatMap(page => page.words.filter((word, index) =>
    word.text.normalize("NFKC") === wanted && (!next || following(page.words, index).startsWith(next))));
  if (!candidates.length) {
    return [finding({ rule: "ULI-L12/pdf-scale", status: STATUS.UNKNOWN, location, state, evidence: `Reference word "${wanted}" was not found in the extracted PDF text.` })];
  }
  const expectedPt = reference.widthPx * (PT_PER_IN / CSS_PX_PER_IN);
  const actualPt = candidates[0].xMax - candidates[0].xMin;
  const ratio = actualPt / expectedPt;
  return [finding({
    rule: "ULI-L12/pdf-scale",
    status: Math.abs(1 - ratio) <= tolerance ? STATUS.PASS : STATUS.FAIL,
    location,
    state,
    evidence: Math.abs(1 - ratio) <= tolerance
      ? `Reference word "${wanted}" keeps its authored size (scale ${fmt(ratio)}).`
      : `Reference word "${wanted}" is printed at ${Math.round(ratio * 100)}% of its authored size: the renderer rescaled the document.`,
    measured: { expectedPt: fmt(expectedPt), actualPt: fmt(actualPt), ratio: Math.round(ratio * 1000) / 1000 },
    tolerance: { ratio: tolerance },
  })];
}

/**
 * ULI-L12/pdf-truncation: every word rendered under print media is present in
 * the PDF text layer. Right-to-left tokens may be extracted in visual order;
 * a token found neither way is UNKNOWN (extractor limitation), not PASS.
 */
export function checkPdfTextCompleteness({ surface, state, domText, pdfText, readingText = "" }) {
  const location = `${surface} (PDF)`;
  const raw = String(domText ?? "").split(/\s+/).filter(token => flatText(token));
  const tokens = raw.map(flatText);
  // A token that legitimately broke at its own hyphen (e.g. "ROW-" / "030" in a
  // narrow cell) may be interleaved with neighbouring cells in every
  // extraction order; it is present when each hyphen-separated part is.
  const parts = new Map(raw.map(token => [flatText(token), token.split(/[\u2010\u2011-]+/).map(flatText).filter(Boolean)]));
  if (!tokens.length) return [finding({ rule: "ULI-L12/pdf-truncation", status: STATUS.UNKNOWN, location, state, evidence: "No print-media text was captured." })];
  const pdfFlat = `${flatText(pdfText)}\n${flatText(readingText)}`;
  const pdfWords = new Set(`${pdfText ?? ""} ${readingText ?? ""}`.split(/\s+/).map(flatText));
  // Fragments a renderer hyphenated at a line end. When the line end is also a
  // page or column end, running matter or a neighbouring column separates the
  // two halves in every extraction order, so join them explicitly.
  const hyphenHeads = new Set(`${pdfText ?? ""} ${readingText ?? ""}`.split(/\s+/)
    .filter(word => /[\u00ad\u2010\u2011-]$/.test(word))
    .map(flatText)
    .filter(Boolean));
  const splitAcrossBreak = token => [...hyphenHeads].some(head =>
    head.length < token.length && token.startsWith(head) && (pdfWords.has(token.slice(head.length)) || pdfFlat.includes(token.slice(head.length))));
  const missing = [];
  const unknown = [];
  for (const token of new Set(tokens)) {
    if (pdfWords.has(token) || pdfFlat.includes(token)) continue;
    if (splitAcrossBreak(token)) continue;
    const pieces = parts.get(token) ?? [];
    if (pieces.length > 1 && pieces.every(piece => pdfWords.has(piece) || pdfFlat.includes(piece))) continue;
    if (isRtlText(token)) {
      const reversed = [...token].reverse().join("");
      if (pdfFlat.includes(reversed)) continue;
      unknown.push(token);
    } else {
      missing.push(token);
    }
  }
  const results = [finding({
    rule: "ULI-L12/pdf-truncation",
    status: missing.length ? STATUS.FAIL : STATUS.PASS,
    location,
    state,
    evidence: missing.length
      ? `${missing.length} distinct rendered word(s) are missing from the PDF text layer.`
      : `All ${new Set(tokens).size - unknown.length} distinct left-to-right/numeric words are present in the PDF text layer.`,
    measured: { distinctTokens: new Set(tokens).size, missing: missing.slice(0, 15), missingCount: missing.length },
  })];
  if (unknown.length) {
    results.push(finding({
      rule: "ULI-L12/pdf-truncation-rtl",
      status: STATUS.UNKNOWN,
      location,
      state,
      evidence: `${unknown.length} right-to-left word(s) could not be matched in logical or visual order; pdftotext shaping/ordering prevents a verdict.`,
      measured: { unmatched: unknown.slice(0, 10) },
    }));
  }
  return results;
}

/** Find the 0-based pages whose flat text contains `needle`. */
export function pagesContaining(pageFlats, needle) {
  const flat = flatText(needle);
  if (!flat) return [];
  return pageFlats.flatMap((text, index) => (text.includes(flat) ? [index] : []));
}

/**
 * ULI-L12/table-header-repeat: a table whose header group is declared
 * repeating (display: table-header-group) shows its header cells on every page
 * that carries its body rows.
 */
export function checkTableHeaderRepeat({ surface, state, tables, pageFlats }) {
  const location = `${surface} (PDF)`;
  if (!tables?.length) return [finding({ rule: "ULI-L12/table-header-repeat", status: STATUS.NOT_APPLICABLE, location, state, evidence: "No table declares a header group." })];
  return tables.map(table => {
    const where = `${location} ${table.path}`;
    if (!table.repeats) {
      return finding({ rule: "ULI-L12/table-header-repeat", status: STATUS.NOT_APPLICABLE, location: where, state, evidence: `thead computed display is ${table.theadDisplay}; no repetition is declared.` });
    }
    // Locate each body row by the first of its cells whose text occurs on
    // exactly one PDF page (cells can wrap at hyphens, so try them in order).
    const rows = table.rows ?? (table.rowMarkers ?? []).map(marker => [marker]);
    const unique = rows
      .map(cells => cells.map(marker => ({ marker, pages: pagesContaining(pageFlats, marker) })).find(item => item.pages.length === 1 && flatText(item.marker).length >= 3))
      .filter(Boolean);
    if (!unique.length) {
      return finding({ rule: "ULI-L12/table-header-repeat", status: rows.length ? STATUS.UNKNOWN : STATUS.NOT_APPLICABLE, location: where, state, evidence: rows.length ? "No body-row cell text is unique in the PDF text, so row pages cannot be located." : "Table has no body rows." });
    }
    const rowPages = [...new Set(unique.map(item => item.pages[0]))].sort((a, b) => a - b);
    if (rowPages.length < 2) {
      return finding({ rule: "ULI-L12/table-header-repeat", status: STATUS.NOT_APPLICABLE, location: where, state, evidence: `Body rows fit on ${pageLabel(rowPages[0])}; no continuation.`, measured: { rowPages: rowPages.map(index => index + 1) } });
    }
    // Header words, not whole cells: a multi-line header cell interleaves with
    // its neighbours in extracted text. A word broken mid-way is still missing.
    const headerCells = table.headerCells.flatMap(cell => cell.split(/[\s\u2010\u2011-]+/)).map(flatText).filter(word => word.length >= 2);
    if (!headerCells.length) {
      return finding({ rule: "ULI-L12/table-header-repeat", status: STATUS.UNKNOWN, location: where, state, evidence: "Header group has no text to locate." });
    }
    const missing = rowPages.filter(index => !headerCells.every(cell => pageFlats[index].includes(cell)));
    return finding({
      rule: "ULI-L12/table-header-repeat",
      status: missing.length ? STATUS.FAIL : STATUS.PASS,
      location: where,
      state,
      evidence: missing.length
        ? `Header cells are missing on continuation ${missing.map(pageLabel).join(", ")}.`
        : `Header cells repeat on all ${rowPages.length} pages carrying body rows.`,
      measured: { rowPages: rowPages.map(index => index + 1), pagesMissingHeader: missing.map(index => index + 1), uniqueRowMarkers: unique.length },
    });
  });
}

/**
 * ULI-L12/keep-with-next: an element that declares break-after: avoid (Folio
 * heading keep-with-next intent) starts on the same page as the content that
 * follows it. Ambiguous text is UNKNOWN.
 */
export function checkKeepWithNext({ surface, state, keeps, pageFlats }) {
  const location = `${surface} (PDF)`;
  if (!keeps?.length) return [finding({ rule: "ULI-L12/keep-with-next", status: STATUS.NOT_APPLICABLE, location, state, evidence: "No element declares break-after: avoid." })];
  return keeps.map(keep => {
    const where = `${location} ${keep.path}`;
    const own = pagesContaining(pageFlats, keep.tail);
    const next = pagesContaining(pageFlats, keep.nextHead);
    if (own.length !== 1 || next.length !== 1) {
      return finding({ rule: "ULI-L12/keep-with-next", status: STATUS.UNKNOWN, location: where, state, evidence: `Cannot locate "${keep.tail}" (${own.length} pages) and following "${keep.nextHead}" (${next.length} pages) unambiguously.` });
    }
    const ok = own[0] === next[0];
    return finding({
      rule: "ULI-L12/keep-with-next",
      status: ok ? STATUS.PASS : STATUS.FAIL,
      location: where,
      state,
      evidence: ok ? `"${keep.tail}" shares ${pageLabel(own[0])} with its following content.` : `"${keep.tail}" is stranded at the end of ${pageLabel(own[0])}; following content starts on ${pageLabel(next[0])}.`,
      measured: { elementPage: own[0] + 1, nextPage: next[0] + 1 },
    });
  });
}

/** ULI-L12/running-content: declared per-page running text appears on every page. */
export function checkRunningContent({ surface, state, runningText, marginBoxesDeclared, pageFlats }) {
  const location = `${surface} (PDF)`;
  if (!runningText) {
    return [finding({
      rule: "ULI-L12/running-content",
      status: marginBoxesDeclared ? STATUS.UNKNOWN : STATUS.NOT_APPLICABLE,
      location,
      state,
      evidence: marginBoxesDeclared
        ? "@page margin boxes are declared but the surface declares no per-page expectation (data-uli-running-text); repetition is not verified here."
        : "No running margin-box content is declared.",
    })];
  }
  const missing = pageFlats.flatMap((text, index) => (text.includes(flatText(runningText)) ? [] : [index + 1]));
  return [finding({
    rule: "ULI-L12/running-content",
    status: missing.length ? STATUS.FAIL : STATUS.PASS,
    location,
    state,
    evidence: missing.length ? `Running text "${runningText}" is missing on page(s) ${missing.join(", ")}.` : `Running text "${runningText}" appears on all ${pageFlats.length} pages.`,
    measured: { pages: pageFlats.length, missingPages: missing },
  })];
}

/**
 * ULI-L12/numeric-integrity: numeric table cells (Folio data-align="number")
 * are never split across lines; a broken figure is misread on paper.
 */
export function checkNumericIntegrity({ surface, state, layout }) {
  const location = `${surface} (print preview)`;
  const cells = layout?.numericCells ?? [];
  if (!cells.length) return [finding({ rule: "ULI-L12/numeric-integrity", status: STATUS.NOT_APPLICABLE, location, state, evidence: "No numeric (data-align=\"number\") cells." })];
  const broken = cells.filter(cell => cell.lines > 1);
  return [finding({
    rule: "ULI-L12/numeric-integrity",
    status: broken.length ? STATUS.FAIL : STATUS.PASS,
    location,
    state,
    evidence: broken.length ? `${broken.length} of ${cells.length} numeric cell(s) wrap a value across lines.` : `All ${cells.length} numeric cells render each value on one line.`,
    measured: { cells: cells.length, broken: broken.slice(0, 10) },
  })];
}

/**
 * ULI-L12/page-number (1.0.0 extends L12 to page numbers).
 * - P1 margin-box counters: when the surface declares running text followed by
 *   a counter (data-uli-running-text), the number printed after it on each PDF
 *   page must equal that page's 1-based index.
 * - P0 ef-print-page-number markers carry authored fallback text only; mapping
 *   them to real counters needs a P1/P2 renderer adapter, so they are UNKNOWN.
 */
export function checkPageNumbers({ surface, state, runningText, pageFlats, pageNumberMarkers = 0 }) {
  const location = `${surface} (PDF)`;
  const results = [];
  if (runningText) {
    const needle = flatText(runningText).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const observed = pageFlats.map(text => {
      const match = text.match(new RegExp(`${needle}(\\d+)`));
      return match ? Number(match[1]) : null;
    });
    if (observed.every(value => value === null)) {
      results.push(finding({ rule: "ULI-L12/page-number", status: STATUS.NOT_APPLICABLE, location, state, evidence: "Declared running text carries no page counter." }));
    } else {
      const wrong = observed.flatMap((value, index) => (value === index + 1 ? [] : [{ page: index + 1, printed: value }]));
      results.push(finding({
        rule: "ULI-L12/page-number",
        status: wrong.length ? STATUS.FAIL : STATUS.PASS,
        location,
        state,
        evidence: wrong.length ? `${wrong.length} page(s) print a missing or wrong page number.` : `Pages print counters 1..${observed.length} in order.`,
        measured: { printed: observed, wrong: wrong.slice(0, 10) },
      }));
    }
  }
  if (pageNumberMarkers > 0) {
    results.push(finding({
      rule: "ULI-L12/page-number",
      status: STATUS.UNKNOWN,
      location: `${surface} (print preview) ef-print-page-number`,
      state,
      evidence: `${pageNumberMarkers} ef-print-page-number marker(s) render authored fallback text; P0 core does not compute page numbers and no P1/P2 adapter was exercised.`,
      measured: { markers: pageNumberMarkers },
    }));
  }
  if (!results.length) {
    results.push(finding({ rule: "ULI-L12/page-number", status: STATUS.NOT_APPLICABLE, location, state, evidence: "No page counter or ef-print-page-number marker is declared." }));
  }
  return results;
}

const OFFSET_PROPERTY = /^(margin(-[a-z-]+)?|inset(-[a-z-]+)?|top|right|bottom|left|translate|transform)$/;

/**
 * ULI-L13/no-one-off-offsets: spacing, sizing and alignment come from tokens
 * and composition primitives. A literal negative length on an offset property
 * (negative margin, inset or translate in absolute units) is an arbitrary
 * positional correction. Percent translations (self-relative centering or
 * hide-until-focus) and token-derived values (calc(-1 * var(--token))) are
 * composition, not nudges.
 */
export function checkTokenizedOffsets({ source, cssText }) {
  const location = `${source} (stylesheet)`;
  const declarations = [...String(cssText ?? "").replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g)];
  if (!declarations.length) return [finding({ rule: "ULI-L13/no-one-off-offsets", status: STATUS.UNKNOWN, location, state: "static stylesheet", evidence: "No declarations were read." })];
  const offenders = declarations
    .filter(([, property]) => OFFSET_PROPERTY.test(property))
    .filter(([, , value]) => /(^|[\s(,])-\d*\.?\d+(px|rem|em|in|pt|pc|mm|cm|ch|ex|vw|vh|q)\b/i.test(value))
    .map(([, property, value]) => `${property}: ${value.trim()}`);
  return [finding({
    rule: "ULI-L13/no-one-off-offsets",
    status: offenders.length ? STATUS.FAIL : STATUS.PASS,
    location,
    state: "static stylesheet",
    evidence: offenders.length ? `${offenders.length} literal negative offset(s): ${offenders.slice(0, 5).join("; ")}.` : `${declarations.length} declarations use no literal negative offsets.`,
    measured: { declarations: declarations.length, offenders },
  })];
}
