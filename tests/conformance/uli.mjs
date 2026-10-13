// GH-54: Universal UI layout/interaction (ULI) conformance finding model.
//
// The contract is NOT forked here. Folio references the canonical standard by
// repository path and version; rule IDs below are cited, never redefined.
// Every check in tests/conformance/*-rules.mjs is a pure function that maps
// measurements to findings built with `finding()`. Missing evidence is UNKNOWN,
// never PASS.

export const ULI_STANDARD = Object.freeze({
  repository: "kemiller2002/visual-engineering",
  path: "framework/standards/UI-LAYOUT-INTERACTION.md",
  version: "0.1.0",
  note: "Rollout baseline; promotion to 1.0.0 is tracked in kemiller2002/visual-engineering#47. Re-pin this version when 1.0.0 is published.",
});

export const STATUS = Object.freeze({
  PASS: "PASS",
  FAIL: "FAIL",
  UNKNOWN: "UNKNOWN",
  NOT_APPLICABLE: "NOT_APPLICABLE",
  EXCEPTION: "EXCEPTION",
});

const statuses = new Set(Object.values(STATUS));

/**
 * Build one immutable finding.
 * rule: ULI rule ID (optionally with a Folio check suffix, e.g. "ULI-L12/page-box").
 * location: surface + element/page; state: media/viewport/renderer state.
 * evidence: human-readable statement of what was observed.
 * measured / tolerance: machine-readable observation and the allowed bound.
 */
export function finding({ rule, status, location, state, evidence, measured = null, tolerance = null }) {
  if (!/^ULI-[LA]\d{2}\b/.test(rule ?? "")) throw new TypeError(`finding: invalid ULI rule id "${rule}"`);
  if (!statuses.has(status)) throw new TypeError(`finding: invalid status "${status}"`);
  if (!location) throw new TypeError("finding: location is required");
  return Object.freeze({
    rule,
    status,
    location,
    state: state ?? "unspecified",
    evidence: evidence ?? "",
    measured,
    tolerance,
  });
}

/** Aggregate a fold over findings into per-status counts. */
export function summarize(findings) {
  const counts = Object.fromEntries(Object.values(STATUS).map(status => [status, 0]));
  for (const item of findings) counts[item.status] += 1;
  return { total: findings.length, ...counts };
}

/** Group findings by rule ID prefix (e.g. "ULI-L12") with status counts. */
export function summarizeByRule(findings) {
  const groups = new Map();
  for (const item of findings) {
    const id = item.rule.split("/")[0];
    groups.set(id, [...(groups.get(id) ?? []), item]);
  }
  return Object.fromEntries([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, items]) => [id, summarize(items)]));
}

/**
 * Apply owned, bounded, justified exceptions. An exception matches a FAIL
 * finding by exact rule and a location prefix; it never turns UNKNOWN into
 * anything else and never matches PASS. Expired exceptions do not apply.
 */
export function applyExceptions(findings, exceptions, today = new Date().toISOString().slice(0, 10)) {
  const active = exceptions.filter(exception => !exception.expires || exception.expires >= today);
  return findings.map(item => {
    if (item.status !== STATUS.FAIL) return item;
    const match = active.find(exception => exception.rule === item.rule && item.location.startsWith(exception.location));
    if (!match) return item;
    return finding({
      ...item,
      status: STATUS.EXCEPTION,
      evidence: `${item.evidence} | exception: ${match.reason} (owner ${match.owner}, expires ${match.expires ?? "never"}, re-review: ${match.reReview ?? "n/a"})`,
    });
  });
}

/** Validate the shape of an exceptions file; returns a list of problems. */
export function validateExceptions(exceptions) {
  const problems = [];
  for (const [index, exception] of exceptions.entries()) {
    for (const field of ["rule", "location", "reason", "owner", "evidence", "expires"]) {
      if (!exception[field]) problems.push(`exceptions[${index}] is missing ${field}`);
    }
  }
  return problems;
}
