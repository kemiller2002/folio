// GH-54: unit tests for the pure ULI conformance rules. Synthetic measurements
// prove that each rule reports FAIL on a violation, PASS only on positive
// evidence, and UNKNOWN (never PASS) when evidence is missing.

import assert from "node:assert/strict";
import test from "node:test";
import { STATUS, ULI_STANDARD, applyExceptions, finding, summarize, validateExceptions } from "./conformance/uli.mjs";
import {
  checkClippingContainers,
  checkHeadersFooters,
  checkKeepWithNext,
  checkNumericIntegrity,
  checkOwnBoxSpill,
  checkPageBoxContainment,
  checkPageNumbers,
  checkPdfPages,
  checkPdfScale,
  checkPdfTextCompleteness,
  checkPdfWordPlacement,
  checkRunningContent,
  checkTableHeaderRepeat,
  checkTokenizedOffsets,
  flatText,
  parseBboxXhtml,
  parseLengthIn,
  parseMarginIn,
  parsePageSize,
  resolvePageBox,
} from "./conformance/print-rules.mjs";
import {
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

const ctx = { surface: "fixture:test.html", state: "unit" };
const statusOf = findings => findings.map(item => item.status);
const letter = resolvePageBox({ size: "Letter", margin: "0.7in" }, {});

test("standard is referenced by path and version, not forked", () => {
  assert.equal(ULI_STANDARD.path, "framework/standards/UI-LAYOUT-INTERACTION.md");
  assert.match(ULI_STANDARD.version, /^\d+\.\d+\.\d+$/);
});

test("standard is pinned to the canonical 1.0.0 release and revision", () => {
  assert.equal(ULI_STANDARD.version, "1.0.0");
  assert.equal(ULI_STANDARD.canonicalReference, "visual-engineering/UI-LAYOUT-INTERACTION@1.0.0");
  assert.match(ULI_STANDARD.revision, /^8da8fbc[0-9a-f]{33}$/);
  assert.equal(finding({ rule: "ULI-L13/no-one-off-offsets", status: STATUS.PASS, location: "x" }).rule, "ULI-L13/no-one-off-offsets");
});

test("finding() validates rule ids and statuses", () => {
  assert.throws(() => finding({ rule: "L12", status: STATUS.PASS, location: "x" }));
  assert.throws(() => finding({ rule: "ULI-L12", status: "OK", location: "x" }));
  assert.equal(finding({ rule: "ULI-L12/page-box", status: STATUS.PASS, location: "x" }).state, "unspecified");
});

test("exceptions only convert matching FAIL findings and expire", () => {
  const fail = finding({ rule: "ULI-L12/page-box", status: STATUS.FAIL, location: "fixture:a.html (print preview)" });
  const unknown = finding({ rule: "ULI-L12/page-box", status: STATUS.UNKNOWN, location: "fixture:a.html (print preview)" });
  const exception = { rule: "ULI-L12/page-box", location: "fixture:a.html", reason: "r", owner: "o", evidence: "e", expires: "2099-01-01" };
  assert.deepEqual(statusOf(applyExceptions([fail, unknown], [exception], "2026-10-13")), [STATUS.EXCEPTION, STATUS.UNKNOWN]);
  assert.deepEqual(statusOf(applyExceptions([fail], [{ ...exception, expires: "2026-01-01" }], "2026-10-13")), [STATUS.FAIL]);
  assert.equal(validateExceptions([{ rule: "ULI-L12" }]).length, 5);
  assert.deepEqual(summarize([fail, unknown]), { total: 2, PASS: 0, FAIL: 1, UNKNOWN: 1, NOT_APPLICABLE: 0, EXCEPTION: 0 });
});

test("page geometry parsing covers named sizes, orientation, units and custom properties", () => {
  assert.ok(Math.abs(parseLengthIn("25.4mm") - 1) < 1e-9);
  assert.equal(parseLengthIn("72pt"), 1);
  assert.equal(parseLengthIn("auto"), null);
  assert.deepEqual(parsePageSize("Letter landscape"), { widthIn: 11, heightIn: 8.5 });
  assert.equal(Math.round(parsePageSize("A4").widthIn * 25.4), 210);
  assert.deepEqual(parseMarginIn("1in 0.5in"), { top: 1, right: 0.5, bottom: 1, left: 0.5 });
  const a4 = resolvePageBox({ size: "var(--ef-print-page-size)", margin: "var(--ef-print-page-margin)" }, { "--ef-print-page-size": "A4", "--ef-print-page-margin": "18mm" });
  assert.equal(Math.round(a4.widthPt), 595);
  assert.equal(Math.round(a4.contentWidthPx), Math.round(((210 - 36) / 25.4) * 96));
  assert.equal(letter.contentWidthPx, 7.1 * 96);
  const undeclared = resolvePageBox({ size: "", margin: "" }, {});
  assert.equal(undeclared.marginDeclared, false);
});

test("flatText folds case, compatibility forms, whitespace and hyphenation", () => {
  assert.equal(flatText("Ef\uFB01cient  frag-\nment"), "efficientfragment");
  assert.equal(flatText("\u202bLTR run\u202c"), "ltrrun");
});

test("parseBboxXhtml reads pages and decoded words", () => {
  const pages = parseBboxXhtml('<page width="612.000000" height="792.000000">\n<word xMin="50.0" yMin="50.0" xMax="80.0" yMax="60.0">A&amp;B</word>\n</page>');
  assert.equal(pages.length, 1);
  assert.equal(pages[0].words[0].text, "A&B");
});

const layout = (overrides = {}) => ({
  pageBox: letter,
  viewportWidthPx: 681.6,
  documentScrollWidth: 681,
  documentClientWidth: 681,
  boxes: [{ kind: "text", path: "p", containerPath: "p", left: 0, right: 600, containerLeft: 0, containerRight: 681, sample: "ok" }],
  clippers: [],
  regions: [],
  ...overrides,
});

test("page-box containment fails on overflow and is UNKNOWN without evidence", () => {
  assert.deepEqual(statusOf(checkPageBoxContainment({ ...ctx, layout: layout() })), [STATUS.PASS]);
  const overflow = layout({ documentScrollWidth: 1223, boxes: [{ kind: "text", path: "p", left: 0, right: 1223, containerLeft: 0, containerRight: 681, sample: "https://..." }] });
  assert.deepEqual(statusOf(checkPageBoxContainment({ ...ctx, layout: overflow })), [STATUS.FAIL]);
  assert.deepEqual(statusOf(checkPageBoxContainment({ ...ctx, layout: layout({ boxes: [] }) })), [STATUS.UNKNOWN]);
  assert.deepEqual(statusOf(checkPageBoxContainment({ ...ctx, layout: layout({ pageBox: null }) })), [STATUS.UNKNOWN]);
});

test("named pages are judged against their own content box", () => {
  const named = layout({ namedContentWidths: { wide: 921.6 }, documentScrollWidth: 891, boxes: [{ kind: "text", path: "td", left: 820, right: 891, containerLeft: 820, containerRight: 891, pageName: "wide", sample: "1" }] });
  assert.deepEqual(statusOf(checkPageBoxContainment({ ...ctx, layout: named })), [STATUS.PASS]);
  const tooWide = layout({ namedContentWidths: { wide: 921.6 }, documentScrollWidth: 936, boxes: [{ kind: "text", path: "td", left: 900, right: 936, containerLeft: 900, containerRight: 936, pageName: "wide", sample: "1" }] });
  assert.deepEqual(statusOf(checkPageBoxContainment({ ...ctx, layout: tooWide })), [STATUS.FAIL]);
});

test("own-box spill detects text escaping a sidebar or column track", () => {
  const spill = layout({ boxes: [{ kind: "text", path: "aside p", containerPath: "aside p", left: 523, right: 820, containerLeft: 523, containerRight: 681, sample: "url" }] });
  assert.deepEqual(statusOf(checkOwnBoxSpill({ ...ctx, layout: spill })), [STATUS.FAIL]);
  assert.deepEqual(statusOf(checkOwnBoxSpill({ ...ctx, layout: layout() })), [STATUS.PASS]);
});

test("clipping containers: NOT_APPLICABLE without clippers, FAIL when content is hidden", () => {
  assert.deepEqual(statusOf(checkClippingContainers({ ...ctx, layout: layout() })), [STATUS.NOT_APPLICABLE]);
  const clipped = layout({ clippers: [{ path: "div", scrollWidth: 900, clientWidth: 600, scrollHeight: 10, clientHeight: 10 }] });
  assert.deepEqual(statusOf(checkClippingContainers({ ...ctx, layout: clipped })), [STATUS.FAIL]);
});

test("header/footer slots must sit at the edge they name; repeat=page stays UNKNOWN in P0", () => {
  const region = { tag: "ef-print-footer", path: "ef-print-footer", text: "L R", left: 0, right: 681, width: 681, height: 14, repeat: null, direction: "ltr" };
  const good = layout({ regions: [{ ...region, slots: [{ name: "left", textLeft: 0, textRight: 10 }, { name: "right", textLeft: 671, textRight: 681 }] }] });
  assert.deepEqual(statusOf(checkHeadersFooters({ ...ctx, layout: good })), [STATUS.PASS, STATUS.PASS, STATUS.PASS]);
  const bad = layout({ regions: [{ ...region, repeat: "page", slots: [{ name: "right", textLeft: 439, textRight: 449 }] }] });
  assert.deepEqual(statusOf(checkHeadersFooters({ ...ctx, layout: bad })), [STATUS.PASS, STATUS.FAIL, STATUS.UNKNOWN]);
  assert.deepEqual(statusOf(checkHeadersFooters({ ...ctx, layout: layout() })), [STATUS.NOT_APPLICABLE]);
});

test("numeric integrity fails when a value wraps", () => {
  assert.deepEqual(statusOf(checkNumericIntegrity({ ...ctx, layout: layout({ numericCells: [{ path: "td", lines: 2, text: "10980.00" }] }) })), [STATUS.FAIL]);
  assert.deepEqual(statusOf(checkNumericIntegrity({ ...ctx, layout: layout({ numericCells: [{ path: "td", lines: 1, text: "1" }] }) })), [STATUS.PASS]);
});

const page = (words, widthPt = 612, heightPt = 792) => ({ widthPt, heightPt, words });
const word = (text, xMin = 60, xMax = 100) => ({ text, xMin, xMax, yMin: 60, yMax: 70 });

test("PDF pages: size, count and per-page text", () => {
  const pdf = { pages: [page([word("One")]), page([word("Two")])] };
  assert.deepEqual(statusOf(checkPdfPages({ ...ctx, pdf, pageBoxes: [letter], estimatedPages: 2 })), [STATUS.PASS, STATUS.PASS, STATUS.PASS]);
  const blank = { pages: [page([]), page([word("x")], 595, 842)] };
  assert.deepEqual(statusOf(checkPdfPages({ ...ctx, pdf: blank, pageBoxes: [letter], estimatedPages: 2 })), [STATUS.PASS, STATUS.FAIL, STATUS.FAIL]);
  assert.deepEqual(statusOf(checkPdfPages({ ...ctx, pdf: { pages: Array.from({ length: 30 }, () => page([word("x")])) }, pageBoxes: [letter], estimatedPages: 2 })).slice(0, 1), [STATUS.FAIL]);
  assert.deepEqual(statusOf(checkPdfPages({ ...ctx, pdf: { pages: [] }, pageBoxes: [letter], estimatedPages: 1 })), [STATUS.UNKNOWN]);
});

test("PDF word placement: off-page words are clipped; margin intrusion is judged only for declared margins", () => {
  const pdf = { pages: [page([word("ok"), word("clipped", 590, 640), word("margin", 10, 40)])] };
  assert.deepEqual(statusOf(checkPdfWordPlacement({ ...ctx, pdf, pageBox: letter, marginBoxesDeclared: false })), [STATUS.FAIL, STATUS.FAIL]);
  assert.deepEqual(statusOf(checkPdfWordPlacement({ ...ctx, pdf, pageBox: letter, marginBoxesDeclared: true })), [STATUS.FAIL, STATUS.NOT_APPLICABLE]);
  const undeclared = resolvePageBox({ size: "Letter", margin: "" }, {});
  assert.deepEqual(statusOf(checkPdfWordPlacement({ ...ctx, pdf: { pages: [page([word("ok")])] }, pageBox: undeclared, marginBoxesDeclared: false })), [STATUS.PASS, STATUS.UNKNOWN]);
});

test("PDF scale detects shrink-to-fit and is UNKNOWN when the reference is absent", () => {
  const pdf = { pages: [page([word("Adversarial", 50, 80.09)])] };
  assert.deepEqual(statusOf(checkPdfScale({ ...ctx, reference: { text: "Adversarial", widthPx: 152.55 }, pdf })), [STATUS.FAIL]);
  assert.deepEqual(statusOf(checkPdfScale({ ...ctx, reference: { text: "Adversarial", widthPx: 40.12 }, pdf })), [STATUS.PASS]);
  assert.deepEqual(statusOf(checkPdfScale({ ...ctx, reference: { text: "Missing", widthPx: 40 }, pdf })), [STATUS.UNKNOWN]);
  assert.deepEqual(statusOf(checkPdfScale({ ...ctx, reference: null, pdf })), [STATUS.UNKNOWN]);
  // A smaller running-header copy of the same word is skipped by context.
  const twoCopies = { pages: [page([word("Adversarial", 200, 230), word("print"), word("fixture"), word("Adversarial", 50, 164.4), word("print"), word("conformance")])] };
  assert.deepEqual(statusOf(checkPdfScale({ ...ctx, reference: { text: "Adversarial", next: "print conformance", widthPx: 152.55 }, pdf: twoCopies })), [STATUS.PASS]);
});

test("PDF text completeness: missing LTR words FAIL; unmatched RTL words are UNKNOWN", () => {
  assert.deepEqual(statusOf(checkPdfTextCompleteness({ ...ctx, domText: "alpha beta-gamma", pdfText: "alpha beta-\ngamma" })), [STATUS.PASS]);
  assert.deepEqual(statusOf(checkPdfTextCompleteness({ ...ctx, domText: "alpha truncated", pdfText: "alpha" })), [STATUS.FAIL]);
  assert.deepEqual(statusOf(checkPdfTextCompleteness({ ...ctx, domText: "split", pdfText: "", readingText: "spl-\nit" })), [STATUS.PASS]);
  assert.deepEqual(statusOf(checkPdfTextCompleteness({ ...ctx, domText: "اليسار", pdfText: "راسيلا" })), [STATUS.PASS]);
  assert.deepEqual(statusOf(checkPdfTextCompleteness({ ...ctx, domText: "alpha اليسار", pdfText: "alpha" })), [STATUS.PASS, STATUS.UNKNOWN]);
  assert.deepEqual(statusOf(checkPdfTextCompleteness({ ...ctx, domText: "", pdfText: "x" })), [STATUS.UNKNOWN]);
  assert.deepEqual(statusOf(checkPdfTextCompleteness({ ...ctx, domText: "ROW-030", pdfText: "ROW-   Ledger\n030    Ledger" })), [STATUS.PASS]);
  assert.deepEqual(statusOf(checkPdfTextCompleteness({ ...ctx, domText: "ROW-030", pdfText: "ROW-   Ledger" })), [STATUS.FAIL]);
  // Chromium 153 hyphenates across a page break; running matter sits between the halves.
  const acrossPages = "reconciles the appar\u2010\nFenwick J. Journal 14\f\nently contradictory findings";
  assert.deepEqual(statusOf(checkPdfTextCompleteness({ ...ctx, domText: "reconciles the apparently contradictory", pdfText: acrossPages })), [STATUS.PASS]);
  assert.deepEqual(statusOf(checkPdfTextCompleteness({ ...ctx, domText: "apparently", pdfText: "appar\u2010\nFenwick" })), [STATUS.FAIL]);
});

test("table header repetition across continuation pages", () => {
  const table = { path: "table", repeats: true, theadDisplay: "table-header-group", headerCells: ["ID", "Unit price"], rowMarkers: ["ROW-001", "ROW-002", "ROW-003"] };
  const pass = ["id unit price row-001", "id unit price row-002 row-003"].map(flatText);
  const fail = ["id unit price row-001", "row-002 row-003"].map(flatText);
  assert.deepEqual(statusOf(checkTableHeaderRepeat({ ...ctx, tables: [table], pageFlats: pass })), [STATUS.PASS]);
  assert.deepEqual(statusOf(checkTableHeaderRepeat({ ...ctx, tables: [table], pageFlats: fail })), [STATUS.FAIL]);
  assert.deepEqual(statusOf(checkTableHeaderRepeat({ ...ctx, tables: [table], pageFlats: [flatText("id unit price row-001 row-002 row-003")] })), [STATUS.NOT_APPLICABLE]);
  assert.deepEqual(statusOf(checkTableHeaderRepeat({ ...ctx, tables: [{ ...table, rowMarkers: ["A"] }], pageFlats: pass })), [STATUS.UNKNOWN]);
  assert.deepEqual(statusOf(checkTableHeaderRepeat({ ...ctx, tables: [{ ...table, repeats: false, theadDisplay: "table-row-group" }], pageFlats: pass })), [STATUS.NOT_APPLICABLE]);
});

test("keep-with-next: stranded heading FAILs, ambiguous text is UNKNOWN", () => {
  const keeps = [{ path: "h2", tail: "Heading B", nextHead: "First words of body" }];
  assert.deepEqual(statusOf(checkKeepWithNext({ ...ctx, keeps, pageFlats: ["heading b first words of body"].map(flatText) })), [STATUS.PASS]);
  assert.deepEqual(statusOf(checkKeepWithNext({ ...ctx, keeps, pageFlats: ["heading b", "first words of body"].map(flatText) })), [STATUS.FAIL]);
  assert.deepEqual(statusOf(checkKeepWithNext({ ...ctx, keeps, pageFlats: ["heading b", "heading b first words of body"].map(flatText) })), [STATUS.UNKNOWN]);
  assert.deepEqual(statusOf(checkKeepWithNext({ ...ctx, keeps: [], pageFlats: [] })), [STATUS.NOT_APPLICABLE]);
});

test("running content must appear on every page when declared", () => {
  assert.deepEqual(statusOf(checkRunningContent({ ...ctx, runningText: "RUN", marginBoxesDeclared: true, pageFlats: ["run 1", "run 2"] })), [STATUS.PASS]);
  assert.deepEqual(statusOf(checkRunningContent({ ...ctx, runningText: "RUN", marginBoxesDeclared: true, pageFlats: ["run 1", "body"] })), [STATUS.FAIL]);
  assert.deepEqual(statusOf(checkRunningContent({ ...ctx, runningText: "", marginBoxesDeclared: true, pageFlats: [] })), [STATUS.UNKNOWN]);
  assert.deepEqual(statusOf(checkRunningContent({ ...ctx, runningText: "", marginBoxesDeclared: false, pageFlats: [] })), [STATUS.NOT_APPLICABLE]);
});

const sitectx = { page: "site:/", state: "unit" };

test("control classification and truthful semantics", () => {
  assert.equal(controlKind({ tag: "a", href: "javascript:void(0)" }), "script-link");
  assert.equal(controlKind({ tag: "a", href: "#" }), "empty-link");
  assert.equal(controlKind({ tag: "a", href: "#main" }), "fragment-link");
  assert.equal(controlKind({ tag: "a", href: "https://example.com/", sameOrigin: false }), "external-link");
  assert.equal(controlKind({ tag: "a", href: "../x/" , sameOrigin: true }), "internal-link");
  assert.equal(controlKind({ tag: "summary" }), "disclosure");
  assert.equal(controlKind({ tag: "div", tabindex: "0" }), "focusable-region");
  assert.deepEqual(statusOf(checkControlSemantics({ ...sitectx, control: { tag: "a", href: "#", path: "a", name: "Go" } })), [STATUS.PASS, STATUS.FAIL]);
  assert.deepEqual(statusOf(checkControlSemantics({ ...sitectx, control: { tag: "a", href: "../x/", path: "a", name: "", sameOrigin: true } })), [STATUS.FAIL, STATUS.PASS]);
  assert.deepEqual(statusOf(checkControlSemantics({ ...sitectx, control: { tag: "button", path: "button", name: "Do" } })), [STATUS.PASS, STATUS.UNKNOWN]);
});

test("link outcomes: resolved destinations PASS, missing fragments FAIL, external links stay UNKNOWN", () => {
  const control = { tag: "a", href: "../x/#y", absoluteHref: "http://h/x/#y", path: "a", sameOrigin: true };
  assert.equal(checkLinkOutcome({ ...sitectx, control, resolution: { url: control.absoluteHref, status: 200, fragment: "y", hasFragmentTarget: true, title: "X" } }).status, STATUS.PASS);
  assert.equal(checkLinkOutcome({ ...sitectx, control, resolution: { url: control.absoluteHref, status: 200, fragment: "y", hasFragmentTarget: false, title: "X" } }).status, STATUS.FAIL);
  assert.equal(checkLinkOutcome({ ...sitectx, control, resolution: { url: control.absoluteHref, status: 404, title: "" } }).status, STATUS.FAIL);
  assert.equal(checkLinkOutcome({ ...sitectx, control, resolution: null }).status, STATUS.UNKNOWN);
  const external = { tag: "a", href: "https://echelonfoundry.com/", absoluteHref: "https://echelonfoundry.com/", sameOrigin: false, path: "a" };
  assert.equal(checkLinkOutcome({ ...sitectx, control: external, resolution: null }).status, STATUS.UNKNOWN);
});

test("disclosures must toggle with pointer, Enter and Space", () => {
  const control = { path: "summary" };
  const ok = { initialOpen: false, afterClickOpen: true, revealedHeight: 120, afterEnterOpen: false, afterSpaceOpen: true };
  assert.deepEqual(statusOf(checkDisclosureOutcome({ ...sitectx, control, observation: ok })), [STATUS.PASS, STATUS.PASS]);
  const inert = { initialOpen: false, afterClickOpen: false, revealedHeight: 0, afterEnterOpen: false, afterSpaceOpen: false };
  assert.deepEqual(statusOf(checkDisclosureOutcome({ ...sitectx, control, observation: inert })), [STATUS.FAIL, STATUS.FAIL]);
  assert.deepEqual(statusOf(checkDisclosureOutcome({ ...sitectx, control, observation: null })), [STATUS.UNKNOWN]);
});

test("preview frames, keyboard reach and skip link", () => {
  const control = { path: "iframe", name: "Example" };
  assert.equal(checkPreviewFrame({ ...sitectx, control, observation: { url: "/demos/a/1.html", loaded: true, textLength: 20 } }).status, STATUS.PASS);
  assert.equal(checkPreviewFrame({ ...sitectx, control: { path: "iframe", name: "" }, observation: { url: "/x", loaded: true, textLength: 20 } }).status, STATUS.FAIL);
  assert.equal(checkKeyboardReach({ ...sitectx, expected: ["a", "b"], reached: ["a", "b"] }).status, STATUS.PASS);
  assert.equal(checkKeyboardReach({ ...sitectx, expected: ["a", "b"], reached: ["a"] }).status, STATUS.FAIL);
  assert.equal(checkKeyboardReach({ ...sitectx, expected: [], reached: [] }).status, STATUS.NOT_APPLICABLE);
  assert.equal(checkSkipLink({ ...sitectx, observation: { hash: "#main", targetExists: true, firstTabIsSkip: true } }).status, STATUS.PASS);
  assert.equal(checkSkipLink({ ...sitectx, observation: { hash: "", targetExists: true, firstTabIsSkip: false } }).status, STATUS.FAIL);
});

test("responsive overflow and navigation label integrity", () => {
  assert.equal(checkPageOverflow({ ...sitectx, metrics: { scrollWidth: 320, clientWidth: 320 } }).status, STATUS.PASS);
  assert.equal(checkPageOverflow({ ...sitectx, metrics: { scrollWidth: 400, clientWidth: 320 } }).status, STATUS.FAIL);
  assert.equal(checkPageOverflow({ ...sitectx, metrics: null }).status, STATUS.UNKNOWN);
  const item = (text, left, right, top = 0, extra = {}) => ({ path: "a", text, left, right, top, bottom: top + 44, scrollWidth: right - left, clientWidth: right - left, ...extra });
  const ok = [{ path: "nav", containedScroller: false, items: [item("One", 0, 100), item("Two", 110, 200)] }];
  assert.deepEqual(statusOf(checkNavLabels({ ...sitectx, navs: ok, viewportWidth: 320 })), [STATUS.PASS]);
  const overlap = [{ path: "nav", containedScroller: false, items: [item("One", 0, 120), item("Two", 100, 200)] }];
  assert.deepEqual(statusOf(checkNavLabels({ ...sitectx, navs: overlap, viewportWidth: 320 })), [STATUS.FAIL]);
  const cropped = [{ path: "nav", containedScroller: false, items: [item("Longer label", 0, 60, 0, { scrollWidth: 90, clientWidth: 60 })] }];
  assert.deepEqual(statusOf(checkNavLabels({ ...sitectx, navs: cropped, viewportWidth: 320 })), [STATUS.FAIL]);
  const offscreen = [{ path: "nav", containedScroller: false, items: [item("Far", 330, 400)] }];
  assert.deepEqual(statusOf(checkNavLabels({ ...sitectx, navs: offscreen, viewportWidth: 320 })), [STATUS.FAIL]);
  assert.deepEqual(statusOf(checkNavLabels({ ...sitectx, navs: [{ ...offscreen[0], containedScroller: true }], viewportWidth: 320 })), [STATUS.PASS]);
});

test("page numbers: P1 counters must match page order; P0 markers stay UNKNOWN", () => {
  const ok = ["body uli-running-footer 1", "body uli-running-footer 2"].map(flatText);
  assert.deepEqual(statusOf(checkPageNumbers({ ...ctx, runningText: "ULI-RUNNING-FOOTER", pageFlats: ok })), [STATUS.PASS]);
  const wrong = ["body uli-running-footer 1", "body uli-running-footer 1"].map(flatText);
  assert.deepEqual(statusOf(checkPageNumbers({ ...ctx, runningText: "ULI-RUNNING-FOOTER", pageFlats: wrong })), [STATUS.FAIL]);
  assert.deepEqual(statusOf(checkPageNumbers({ ...ctx, runningText: "ULI-RUNNING-FOOTER", pageFlats: ["uli-running-footer"].map(flatText) })), [STATUS.NOT_APPLICABLE]);
  assert.deepEqual(statusOf(checkPageNumbers({ ...ctx, runningText: "", pageFlats: [], pageNumberMarkers: 2 })), [STATUS.UNKNOWN]);
  assert.deepEqual(statusOf(checkPageNumbers({ ...ctx, runningText: "", pageFlats: [] })), [STATUS.NOT_APPLICABLE]);
});

test("ULI-L13: literal negative offsets fail; tokens and self-relative percentages pass", () => {
  assert.deepEqual(statusOf(checkTokenizedOffsets({ source: "a.css", cssText: ".x { margin-inline-start: calc(-1 * var(--w)); translate: -50% -50%; transform: translateY(-150%); }" })), [STATUS.PASS]);
  assert.deepEqual(statusOf(checkTokenizedOffsets({ source: "a.css", cssText: ".x { inset-block-start: -.11in; }" })), [STATUS.FAIL]);
  assert.deepEqual(statusOf(checkTokenizedOffsets({ source: "a.css", cssText: ".x { margin-top: -3px; }" })), [STATUS.FAIL]);
  assert.deepEqual(statusOf(checkTokenizedOffsets({ source: "a.css", cssText: "/* margin: -3px; */" })), [STATUS.UNKNOWN]);
});
