// GH-54-EVID: the visual-engineering 1.0.0 evidence document is derived only
// from results.json and validates against the pinned ui-conformance schema.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { STATUS, ULI_STANDARD, finding } from "./conformance/uli.mjs";
import { EVIDENCE_SCHEMA_PATH, aggregateStatus, buildEvidence, evidenceValidator } from "./conformance/evidence.mjs";

const validate = evidenceValidator();
const provenance = JSON.parse(readFileSync(new URL("./fixtures/visual-engineering/ui-conformance-1.0.0/PROVENANCE.json", import.meta.url), "utf8"));

const results = () => ({
  standard: ULI_STANDARD,
  repository: "kemiller2002/folio",
  revision: "0123456789abcdef0123456789abcdef01234567",
  finishedAt: "2026-10-13T00:00:00.000Z",
  scope: "all",
  siteEngines: ["chromium"],
  exceptions: [],
  print: {
    inventory: { notApplicableFamilies: ["menus"] },
    surfaces: [
      { surface: "fixture:a.html", path: "tests/fixtures/a.html" },
      { surface: "fixture:b.html", path: "tests/fixtures/b.html" },
    ],
    stylesheets: ["src/styles/print.css"],
  },
  site: {
    pages: [{ id: "site:/", route: "/", kind: "catalog" }, { id: "site:/demos/x/1.html", route: "/demos/x/1.html", kind: "demo" }],
    actions: [
      { page: "site:/", path: "a#home", kind: "internal-link", role: "link", name: "Overview" },
      { page: "site:/", path: "details > summary", kind: "disclosure", role: "summary", name: "View HTML" },
    ],
  },
  findings: [
    finding({ rule: "ULI-L12/page-box", status: STATUS.PASS, location: "fixture:a.html (print preview)", state: "s", evidence: "inside", measured: { contentWidthPx: 681.6 } }),
    finding({ rule: "ULI-L12/pdf-scale", status: STATUS.PASS, location: "fixture:a.html (PDF)", state: "s", evidence: "scale 1" }),
    finding({ rule: "ULI-L12/page-box", status: STATUS.PASS, location: "fixture:b.html (print preview)", state: "s", evidence: "inside" }),
    finding({ rule: "ULI-L12/keep-with-next", status: STATUS.UNKNOWN, location: "fixture:b.html (PDF) h2", state: "s", evidence: "ambiguous" }),
    finding({ rule: "ULI-L13/no-one-off-offsets", status: STATUS.PASS, location: "src/styles/print.css (stylesheet)", state: "static", evidence: "none" }),
    finding({ rule: "ULI-L12/surface-family", status: STATUS.NOT_APPLICABLE, location: "family:menus", state: "inventory", evidence: "none shipped" }),
    finding({ rule: "ULI-A02/outcome", status: STATUS.PASS, location: "site:/ a#home", state: "chromium; screen; 1280x900", evidence: "navigates" }),
    finding({ rule: "ULI-A02/outcome", status: STATUS.PASS, location: "site:/ details > summary", state: "chromium; screen; 1280x900", evidence: "toggles" }),
    finding({ rule: "ULI-A08/keyboard", status: STATUS.FAIL, location: "site:/ details > summary", state: "chromium; screen; 1280x900", evidence: "Space ignored" }),
    finding({ rule: "ULI-L05/page-overflow", status: STATUS.PASS, location: "site:/", state: "chromium 141; screen; 320px", evidence: "fits" }),
  ],
});

test("the vendored schema is byte-identical to the pinned visual-engineering revision", () => {
  const digest = createHash("sha256").update(readFileSync(EVIDENCE_SCHEMA_PATH)).digest("hex");
  assert.equal(digest, provenance.source.sha256);
  assert.equal(provenance.source.revision, ULI_STANDARD.revision);
  assert.equal(JSON.parse(readFileSync(EVIDENCE_SCHEMA_PATH, "utf8")).properties.standardVersion.const, ULI_STANDARD.version);
});

test("status aggregation never upgrades missing evidence", () => {
  const f = status => ({ status });
  assert.equal(aggregateStatus([]), "unassessed");
  assert.equal(aggregateStatus([f(STATUS.PASS), f(STATUS.UNKNOWN)]), "unknown");
  assert.equal(aggregateStatus([f(STATUS.PASS), f(STATUS.FAIL), f(STATUS.UNKNOWN)]), "fail");
  assert.equal(aggregateStatus([f(STATUS.PASS), f(STATUS.EXCEPTION)]), "exception");
  assert.equal(aggregateStatus([f(STATUS.PASS), f(STATUS.NOT_APPLICABLE)]), "pass");
  assert.equal(aggregateStatus([f(STATUS.NOT_APPLICABLE)]), "not-applicable");
});

test("evidence is derived from findings and validates against the 1.0.0 schema", () => {
  const document = buildEvidence(results());
  const check = validate(document);
  assert.deepEqual(check.errors, []);
  assert.equal(document.standardVersion, "1.0.0");
  assert.equal(document.classification, "print-ui");
  const byId = Object.fromEntries(document.surfaces.map(surface => [surface.id, surface]));
  assert.equal(byId["print:fixture:a.html"].status, "pass");
  assert.deepEqual(byId["print:fixture:a.html"].viewportWidths, [681]);
  assert.equal(byId["print:fixture:b.html"].status, "unknown");
  assert.equal(byId["print:fixture:b.html"].unknownScope.length, 1);
  assert.equal(byId["stylesheet:src/styles/print.css"].status, "pass");
  assert.equal(byId["family:menus"].status, "not-applicable");
  assert.equal(byId["site:/"].status, "fail");
  assert.deepEqual(byId["site:/"].viewportWidths, [320, 1280]);
  assert.equal(byId["site:/demos/x/1.html"].status, "unassessed");
  const [link, disclosure] = byId["site:/"].actions;
  assert.equal(link.status, "pass");
  assert.equal(link.control.role, "link");
  assert.equal(disclosure.status, "fail");
  assert.ok(disclosure.resetStrategy);
});

test("the schema validator rejects a pass without evidence and a wrong standard version", () => {
  const document = buildEvidence(results());
  document.surfaces[0].evidence = [];
  assert.equal(validate(document).valid, false);
  const wrongVersion = { ...buildEvidence(results()), standardVersion: "0.1.0" };
  assert.equal(validate(wrongVersion).valid, false);
});

test("the latest runner output, when present, yields schema-valid evidence", t => {
  const path = new URL("../test-results/ui-conformance/results.json", import.meta.url);
  if (!existsSync(path)) {
    t.skip("no runner output yet; tests/run-ui-conformance.mjs validates evidence.json itself when it runs");
    return;
  }
  const latest = JSON.parse(readFileSync(path, "utf8"));
  if (!latest.revision) {
    t.skip("results.json predates evidence support; re-run npm run ui:conformance");
    return;
  }
  assert.deepEqual(validate(buildEvidence(latest)).errors, []);
});
