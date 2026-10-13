// GH-54: pure ULI action (A01..A10) and responsive layout (L05/L06/L09) checks
// for the static Folio documentation site and its interactive print previews.
//
// The site ships no browser script ("static-documentation-no-browser-script"),
// so legitimate action outcomes are native: navigation to an existing
// document/fragment, <details> disclosure state, and keyboard focus movement.

import { STATUS, finding } from "./uli.mjs";

export const VIEWPORT_WIDTHS = Object.freeze([320, 390, 768, 1280]);

const fmt = value => Math.round(value * 100) / 100;

/** Classify a collected control into an action kind. */
export function controlKind(control) {
  if (control.tag === "a") {
    const href = control.href ?? "";
    if (/^javascript:/i.test(href)) return "script-link";
    if (href === "" || href === "#") return "empty-link";
    if (href.startsWith("#")) return "fragment-link";
    if (/^(https?:)?\/\//i.test(href) && !control.sameOrigin) return "external-link";
    if (/^mailto:|^tel:/i.test(href)) return "protocol-link";
    return "internal-link";
  }
  if (control.tag === "summary") return "disclosure";
  if (control.tag === "iframe") return "preview-frame";
  if (control.tag === "button" || control.role === "button") return "button";
  if (["input", "select", "textarea"].includes(control.tag)) return "form-control";
  if (control.tabindex !== null && control.tabindex !== undefined && Number(control.tabindex) >= 0) return "focusable-region";
  return "other";
}

/** ULI-A01 / ULI-A06 / ULI-A09: truthful semantics and accessible names. */
export function checkControlSemantics({ page, state, control }) {
  const kind = controlKind(control);
  const location = `${page} ${control.path}`;
  const results = [];
  const name = (control.name ?? "").trim();
  results.push(finding({
    rule: "ULI-A06/accessible-name",
    status: name ? STATUS.PASS : STATUS.FAIL,
    location,
    state,
    evidence: name ? `${kind} exposes name "${name.slice(0, 60)}".` : `${kind} has no accessible name.`,
  }));
  if (kind === "script-link" || kind === "empty-link") {
    results.push(finding({ rule: "ULI-A01/truthful-action", status: STATUS.FAIL, location, state, evidence: `Link uses a no-op destination "${control.href}".` }));
  } else if (kind === "button" || kind === "form-control") {
    results.push(finding({ rule: "ULI-A01/truthful-action", status: STATUS.UNKNOWN, location, state, evidence: `${kind} found on a static page; no wired behavior is known to this runner.` }));
  } else if (control.disabled) {
    results.push(finding({ rule: "ULI-A04/disabled", status: STATUS.UNKNOWN, location, state, evidence: "Disabled control: constraint explanation must be reviewed." }));
  } else {
    results.push(finding({ rule: "ULI-A01/truthful-action", status: STATUS.PASS, location, state, evidence: `${kind} declares a native action.` }));
  }
  return results;
}

/**
 * ULI-A02: link outcome. `resolution` is what the runner observed when it
 * followed the destination: { status, hasFragmentTarget, title, h1 } or null.
 */
export function checkLinkOutcome({ page, state, control, resolution }) {
  const kind = controlKind(control);
  const location = `${page} ${control.path}`;
  if (kind === "external-link") {
    let valid = false;
    try {
      const url = new URL(control.absoluteHref);
      valid = url.protocol === "https:" || url.protocol === "http:";
    } catch {
      valid = false;
    }
    return finding({
      rule: "ULI-A02/outcome",
      status: valid ? STATUS.UNKNOWN : STATUS.FAIL,
      location,
      state,
      evidence: valid
        ? `External destination ${control.absoluteHref} is a valid URL; reachability is not fetched offline and no external operation is claimed.`
        : `External destination "${control.href}" is not a valid URL.`,
    });
  }
  if (!resolution) {
    return finding({ rule: "ULI-A02/outcome", status: STATUS.UNKNOWN, location, state, evidence: "Destination was not followed." });
  }
  const meaningful = resolution.status === 200 && (resolution.hasFragmentTarget !== false) && Boolean(resolution.title || resolution.h1 || resolution.textLength > 0);
  return finding({
    rule: "ULI-A02/outcome",
    status: meaningful ? STATUS.PASS : STATUS.FAIL,
    location,
    state,
    evidence: meaningful
      ? `Navigates to ${resolution.url} (HTTP ${resolution.status}${resolution.fragment ? `, #${resolution.fragment} exists` : ""}).`
      : `Destination ${resolution.url} is not meaningful (HTTP ${resolution.status}, fragment target ${resolution.hasFragmentTarget === false ? "missing" : "n/a"}).`,
    measured: { status: resolution.status, fragment: resolution.fragment ?? null, hasFragmentTarget: resolution.hasFragmentTarget ?? null },
  });
}

/**
 * ULI-A02/ULI-A05/ULI-A08: a disclosure toggles its native open state with
 * pointer and keyboard, reveals content, and can be reset (repeatable).
 */
export function checkDisclosureOutcome({ page, state, control, observation }) {
  const location = `${page} ${control.path}`;
  if (!observation) return [finding({ rule: "ULI-A02/outcome", status: STATUS.UNKNOWN, location, state, evidence: "Disclosure was not exercised." })];
  const { initialOpen, afterClickOpen, revealedHeight, afterEnterOpen, afterSpaceOpen } = observation;
  return [
    finding({
      rule: "ULI-A02/outcome",
      status: afterClickOpen !== initialOpen && revealedHeight > 0 ? STATUS.PASS : STATUS.FAIL,
      location,
      state,
      evidence: `Click changed details.open ${initialOpen} -> ${afterClickOpen}; revealed content height ${fmt(revealedHeight)}px.`,
      measured: { initialOpen, afterClickOpen, revealedHeight: fmt(revealedHeight) },
    }),
    finding({
      rule: "ULI-A08/keyboard",
      status: afterEnterOpen !== afterClickOpen && afterSpaceOpen !== afterEnterOpen ? STATUS.PASS : STATUS.FAIL,
      location,
      state,
      evidence: `Enter toggled to ${afterEnterOpen}; Space toggled to ${afterSpaceOpen} (initial state restored: ${afterSpaceOpen === afterClickOpen}).`,
      measured: { afterEnterOpen, afterSpaceOpen },
    }),
  ];
}

/** ULI-A02: an embedded preview frame names itself and loads a document with content. */
export function checkPreviewFrame({ page, state, control, observation }) {
  const location = `${page} ${control.path}`;
  if (!observation) return finding({ rule: "ULI-A02/outcome", status: STATUS.UNKNOWN, location, state, evidence: "Preview frame was not inspected." });
  const ok = observation.loaded && observation.textLength > 0 && Boolean(control.name);
  return finding({
    rule: "ULI-A02/outcome",
    status: ok ? STATUS.PASS : STATUS.FAIL,
    location,
    state,
    evidence: ok ? `Preview "${control.name}" loads ${observation.url} with ${observation.textLength} characters.` : `Preview frame did not load a named document with content (${observation.url}).`,
    measured: observation,
  });
}

/** ULI-A08: every keyboard-operable control is reached by sequential Tab navigation. */
export function checkKeyboardReach({ page, state, expected, reached }) {
  const location = page;
  if (!expected.length) return finding({ rule: "ULI-A08/keyboard", status: STATUS.NOT_APPLICABLE, location, state, evidence: "No focusable controls." });
  const reachedSet = new Set(reached);
  const missing = expected.filter(path => !reachedSet.has(path));
  return finding({
    rule: "ULI-A08/keyboard",
    status: missing.length ? STATUS.FAIL : STATUS.PASS,
    location,
    state,
    evidence: missing.length ? `${missing.length} of ${expected.length} controls are not reached by Tab.` : `Tab reaches all ${expected.length} controls.`,
    measured: { expected: expected.length, reached: reachedSet.size, missing: missing.slice(0, 10) },
  });
}

/** ULI-A08: the skip link moves focus/scroll target to the main region. */
export function checkSkipLink({ page, state, observation }) {
  if (!observation) return finding({ rule: "ULI-A08/skip-link", status: STATUS.NOT_APPLICABLE, location: page, state, evidence: "No skip link." });
  const ok = observation.hash === "#main" && observation.targetExists && observation.firstTabIsSkip;
  return finding({
    rule: "ULI-A08/skip-link",
    status: ok ? STATUS.PASS : STATUS.FAIL,
    location: `${page} a.skip-link`,
    state,
    evidence: ok ? "First Tab focuses the skip link; Enter moves to #main." : `Skip link observation: ${JSON.stringify(observation)}`,
    measured: observation,
  });
}

/** ULI-L05/ULI-L09: no horizontal page overflow at a supported width. */
export function checkPageOverflow({ page, state, metrics, tolerancePx = 1 }) {
  if (!metrics) return finding({ rule: "ULI-L05/page-overflow", status: STATUS.UNKNOWN, location: page, state, evidence: "Not measured." });
  const overflow = metrics.scrollWidth - metrics.clientWidth;
  return finding({
    rule: "ULI-L05/page-overflow",
    status: overflow > tolerancePx ? STATUS.FAIL : STATUS.PASS,
    location: page,
    state,
    evidence: overflow > tolerancePx ? `Page scrolls horizontally by ${overflow}px.` : `No horizontal page overflow (${metrics.scrollWidth}/${metrics.clientWidth}px).`,
    measured: { scrollWidth: metrics.scrollWidth, clientWidth: metrics.clientWidth, offenders: metrics.offenders?.slice(0, 6) ?? [] },
    tolerance: { px: tolerancePx },
  });
}

/**
 * ULI-L06: navigation labels keep their integrity: a label is not cropped by
 * its own box, does not overlap a sibling label, and is either inside the
 * viewport or inside a contained horizontal scroller.
 */
export function checkNavLabels({ page, state, navs, viewportWidth, tolerancePx = 1 }) {
  if (!navs?.length) return [finding({ rule: "ULI-L06/nav-labels", status: STATUS.NOT_APPLICABLE, location: page, state, evidence: "No navigation landmarks." })];
  return navs.map(nav => {
    const problems = [];
    for (const item of nav.items) {
      if (item.scrollWidth > item.clientWidth + tolerancePx) problems.push(`"${item.text}" cropped (${item.scrollWidth}>${item.clientWidth}px)`);
      if (!item.text) problems.push(`${item.path} has no label`);
      const offscreen = item.right > viewportWidth + tolerancePx || item.left < -tolerancePx;
      if (offscreen && !nav.containedScroller) problems.push(`"${item.text}" is offscreen without a contained scroller`);
    }
    for (let i = 0; i < nav.items.length; i += 1) {
      for (let j = i + 1; j < nav.items.length; j += 1) {
        const a = nav.items[i];
        const b = nav.items[j];
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (overlapX > tolerancePx && overlapY > tolerancePx) problems.push(`"${a.text}" overlaps "${b.text}"`);
      }
    }
    return finding({
      rule: "ULI-L06/nav-labels",
      status: problems.length ? STATUS.FAIL : STATUS.PASS,
      location: `${page} ${nav.path}`,
      state,
      evidence: problems.length ? problems.slice(0, 6).join("; ") : `${nav.items.length} labels intact${nav.containedScroller ? " (contained scroller)" : ""}.`,
      measured: { items: nav.items.length, containedScroller: nav.containedScroller, problems: problems.length },
      tolerance: { px: tolerancePx },
    });
  });
}
