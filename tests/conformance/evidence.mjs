// GH-54-EVID: derive a visual-engineering UI-LAYOUT-INTERACTION@1.0.0 evidence
// document (framework/contracts/ui-conformance.schema.json) from the runner's
// results.json. Pure and mechanical: every status comes from recorded
// findings; nothing is hand-written, and UNKNOWN stays unknown.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { STATUS } from "./uli.mjs";

const require = createRequire(import.meta.url);

export const EVIDENCE_SCHEMA_PATH = new URL("../fixtures/visual-engineering/ui-conformance-1.0.0/ui-conformance.schema.json", import.meta.url);

const SCHEMA_STATUS = Object.freeze({
  [STATUS.PASS]: "pass",
  [STATUS.FAIL]: "fail",
  [STATUS.UNKNOWN]: "unknown",
  [STATUS.NOT_APPLICABLE]: "not-applicable",
  [STATUS.EXCEPTION]: "exception",
});

/**
 * Aggregate finding statuses into one schema status. A single FAIL fails the
 * unit; an EXCEPTION outranks evidence of passing; any UNKNOWN keeps the unit
 * unknown (lack of evidence is never pass); NOT_APPLICABLE only when every
 * finding is not-applicable; no findings at all is "unassessed".
 */
export function aggregateStatus(findings) {
  if (!findings.length) return "unassessed";
  const has = status => findings.some(item => item.status === status);
  if (has(STATUS.FAIL)) return "fail";
  if (has(STATUS.EXCEPTION)) return "exception";
  if (has(STATUS.UNKNOWN)) return "unknown";
  if (has(STATUS.PASS)) return "pass";
  return "not-applicable";
}

const describe = item => `${SCHEMA_STATUS[item.status]} ${item.rule} @ ${item.location} [${item.state}]: ${item.evidence}`;

/** Findings that belong to a surface: exact id, or id followed by a space. */
export function findingsFor(findings, id) {
  return findings.filter(item => item.location === id || item.location.startsWith(`${id} `));
}

const ACTION_CONTRACT = Object.freeze({
  "internal-link": ["Navigate to a documentation or preview page", "Destination resolves (HTTP 200) to a document with content"],
  "fragment-link": ["Move to a target within a document", "The fragment target exists in the destination and keyboard activation sets location.hash"],
  "external-link": ["Navigate to an external destination", "A valid URL; reachability is not fetched and no external operation is claimed"],
  "protocol-link": ["Hand a mailto/tel address to the user agent", "User-agent protocol handling; not exercised by the runner"],
  "disclosure": ["Show or hide the example's HTML source", "details.open toggles by pointer, Enter and Space; source becomes visible; state is reset afterwards"],
  "preview-frame": ["Embed the example's print preview", "The named frame loads its demo document with content"],
  "focusable-region": ["Scroll contained wide content by keyboard", "The region is reachable by sequential Tab navigation"],
});

function surfaceFrom({ id, path, kind, findings, viewportWidths = [], actions = [] }) {
  const surface = {
    id,
    path,
    kind,
    status: aggregateStatus(findings),
    viewportWidths: [...new Set(viewportWidths.filter(width => Number.isInteger(width) && width > 0))].sort((a, b) => a - b),
    alignmentGroups: [],
    actions,
    evidence: findings.map(describe),
  };
  const unknown = findings.filter(item => item.status === STATUS.UNKNOWN).map(describe);
  if (unknown.length) surface.unknownScope = unknown;
  return surface;
}

/** Build the 1.0.0 evidence document from a results.json object. */
export function buildEvidence(results) {
  const findings = results.findings ?? [];
  const surfaces = [];

  for (const item of results.print?.surfaces ?? []) {
    const own = findingsFor(findings, item.surface);
    const pageBox = own.find(entry => entry.rule === "ULI-L12/page-box")?.measured?.contentWidthPx;
    surfaces.push(surfaceFrom({
      id: `print:${item.surface}`,
      path: item.path ?? item.surface,
      kind: "print",
      findings: own,
      viewportWidths: pageBox ? [Math.floor(pageBox)] : [],
    }));
  }

  for (const source of results.print?.stylesheets ?? []) {
    surfaces.push(surfaceFrom({ id: `stylesheet:${source}`, path: source, kind: "other", findings: findingsFor(findings, `${source} (stylesheet)`) }));
  }

  for (const family of results.print?.inventory?.notApplicableFamilies ?? []) {
    surfaces.push(surfaceFrom({ id: `family:${family}`, path: `family:${family}`, kind: "print", findings: findingsFor(findings, `family:${family}`) }));
  }

  const actionsByPage = new Map();
  for (const action of results.site?.actions ?? []) {
    const [intent, expectedOutcome] = ACTION_CONTRACT[action.kind] ?? ["Unclassified control", "No outcome contract is known"];
    const own = findingsFor(findings, `${action.page} ${action.path}`);
    const status = aggregateStatus(own);
    const entry = {
      id: `${action.page} ${action.path}`,
      control: { role: action.role || action.kind, name: action.name || "[no accessible name]" },
      intent,
      expectedOutcome,
      status,
      evidence: own.map(describe),
    };
    if (action.kind === "disclosure") entry.resetStrategy = "details.open is restored to its initial value after each exercise";
    actionsByPage.set(action.page, [...(actionsByPage.get(action.page) ?? []), entry]);
  }

  for (const page of results.site?.pages ?? []) {
    const own = findings.filter(item => item.rule.startsWith("ULI-") && (item.location === page.id || item.location.startsWith(`${page.id} `)));
    const widths = own.map(item => Number(item.state.match(/;\s*(\d+)px\b/)?.[1] ?? item.state.match(/(\d+)x\d+/)?.[1])).filter(Number.isFinite);
    surfaces.push(surfaceFrom({
      id: page.id,
      path: page.route,
      kind: page.kind,
      findings: own,
      viewportWidths: widths,
      actions: actionsByPage.get(page.id) ?? [],
    }));
  }

  return {
    standardVersion: results.standard.version,
    repository: results.repository,
    revision: results.revision,
    classification: "print-ui",
    surfaces,
    exceptions: (results.exceptions ?? []).map(exception => ({
      ruleId: exception.rule.split("/")[0],
      surface: exception.location,
      reason: exception.reason,
      owner: exception.owner,
      reviewTrigger: exception.reReview ?? `expires ${exception.expires}`,
      evidence: [exception.evidence],
    })),
    notes: [
      `Derived mechanically by tests/conformance/evidence.mjs from test-results/ui-conformance/results.json (${results.finishedAt}).`,
      `Standard ${results.standard.canonicalReference} at ${results.standard.revision}.`,
      `Scope ${results.scope}; site engines ${(results.siteEngines ?? []).join(", ")}.`,
      "Surface and action status aggregate their findings: any FAIL -> fail, EXCEPTION -> exception, any UNKNOWN -> unknown, otherwise pass when a PASS exists, not-applicable when every finding is not-applicable, unassessed when none exist.",
      "No peer-alignment groups are declared: Folio print documents and the static documentation site have no side-by-side form controls (ULI-L01 not applicable); alignment is verified through header/footer slot edges (ULI-L12).",
      "print:* surfaces are print/PDF evidence for a document; site:* surfaces are the same routes as screen documentation or demo pages.",
    ].join(" "),
  };
}

/** Compile the pinned 1.0.0 schema with Ajv (JSON Schema 2020-12). */
export function evidenceValidator() {
  const Ajv2020 = require("ajv/dist/2020").default;
  const schema = JSON.parse(readFileSync(EVIDENCE_SCHEMA_PATH, "utf8"));
  // Strict mode stays on. Only strictTypes is relaxed: the upstream schema's
  // if/then branches add minItems without restating type "array", which is a
  // lint warning about schema style, not a change to validation semantics.
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictTypes: false });
  const validate = ajv.compile(schema);
  return document => {
    const valid = validate(document);
    return { valid, errors: valid ? [] : validate.errors.map(error => `${error.instancePath || "/"} ${error.message}`) };
  };
}
