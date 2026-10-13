// GH-54: impure collectors for the Folio documentation site and its preview
// documents. They inventory every enabled control, exercise native outcomes
// (navigation, disclosure state, keyboard focus) and measure responsive layout.

/** In-page: inventory enabled, rendered controls with heuristic accessible names. */
export function inventoryControls() {
  const pathOf = element => {
    const parts = [];
    for (let node = element; node && node.nodeType === 1 && node !== document.documentElement; node = node.parentElement) {
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
  const nameOf = element => {
    const labelledby = element.getAttribute("aria-labelledby");
    if (labelledby) {
      const text = labelledby.split(/\s+/).map(id => document.getElementById(id)?.textContent ?? "").join(" ").trim();
      if (text) return text;
    }
    return (element.getAttribute("aria-label") ?? element.innerText ?? "").trim()
      || element.getAttribute("title")?.trim()
      || [...element.querySelectorAll("img[alt], svg[aria-label]")].map(item => item.getAttribute("alt") ?? item.getAttribute("aria-label")).join(" ").trim();
  };
  const selector = "a[href], summary, iframe, button, input, select, textarea, [tabindex], [role=button], [role=link], [role=tab], [role=switch], [role=menuitem]";
  return [...document.querySelectorAll(selector)]
    .filter(element => {
      const style = getComputedStyle(element);
      if (style.display === "none") return false;
      if (element.closest("details:not([open])") && element.tagName.toLowerCase() !== "summary") return false;
      if (element.tagName.toLowerCase() === "summary" && element.parentElement?.tagName.toLowerCase() !== "details") return false;
      return true;
    })
    .map(element => {
      const href = element.getAttribute("href");
      const absolute = href !== null ? new URL(href, document.baseURI) : null;
      return {
        tag: element.tagName.toLowerCase(),
        role: element.getAttribute("role"),
        path: pathOf(element),
        href,
        absoluteHref: absolute?.href ?? null,
        sameOrigin: absolute ? absolute.origin === location.origin : null,
        target: element.getAttribute("target"),
        tabindex: element.getAttribute("tabindex"),
        disabled: element.matches(":disabled") || element.getAttribute("aria-disabled") === "true",
        name: nameOf(element),
        src: element.getAttribute("src"),
        visuallyHiddenUntilFocus: element.classList.contains("skip-link"),
      };
    });
}

/** In-page: page overflow, offenders, and navigation label geometry. */
export function measureResponsive() {
  const pathOf = element => {
    const parts = [];
    for (let node = element; node && node.nodeType === 1 && node !== document.documentElement; node = node.parentElement) {
      const tag = node.tagName.toLowerCase();
      const cls = typeof node.className === "string" && node.className ? `.${node.className.trim().split(/\s+/)[0]}` : "";
      parts.unshift(`${tag}${cls}`);
      if (node.id || cls) break;
    }
    return parts.join(" > ");
  };
  const client = document.documentElement.clientWidth;
  const offenders = [...document.body.querySelectorAll("*")]
    .filter(element => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0) return false;
      for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
        const overflowX = getComputedStyle(node).overflowX;
        if (overflowX !== "visible") return false;
      }
      return rect.right > client + 1 || rect.left < -1;
    })
    .slice(0, 8)
    .map(element => ({ path: pathOf(element), right: Math.round(element.getBoundingClientRect().right) }));
  const navs = [...document.querySelectorAll("nav")].map(nav => {
    const links = [...nav.querySelectorAll("a")].filter(link => getComputedStyle(link).display !== "none");
    let containedScroller = false;
    for (const link of links.slice(0, 1)) {
      for (let node = link.parentElement; node && node !== nav.parentElement; node = node.parentElement) {
        const overflowX = getComputedStyle(node).overflowX;
        if ((overflowX === "auto" || overflowX === "scroll") && node.scrollWidth > node.clientWidth) containedScroller = true;
      }
    }
    return {
      path: `${pathOf(nav)}[aria-label="${nav.getAttribute("aria-label") ?? ""}"]`,
      containedScroller,
      items: links.map(link => {
        const rect = link.getBoundingClientRect();
        return { path: pathOf(link), text: link.innerText.replace(/\s+/g, " ").trim(), left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, scrollWidth: link.scrollWidth, clientWidth: link.clientWidth };
      }),
    };
  });
  return { scrollWidth: document.documentElement.scrollWidth, clientWidth: client, offenders, navs };
}

/** Exercise one <summary> with pointer, Enter and Space; returns observed native state. */
export async function exerciseDisclosure(page, index) {
  const summary = page.locator("details > summary").nth(index);
  await summary.scrollIntoViewIfNeeded();
  const details = summary.locator("xpath=..");
  const initialOpen = await details.evaluate(element => element.open);
  await summary.click();
  const afterClickOpen = await details.evaluate(element => element.open);
  const revealedHeight = await details.evaluate(element => [...element.children].filter(child => child.tagName !== "SUMMARY").reduce((sum, child) => sum + child.getBoundingClientRect().height, 0));
  await summary.focus();
  await page.keyboard.press("Enter");
  const afterEnterOpen = await details.evaluate(element => element.open);
  await page.keyboard.press("Space");
  const afterSpaceOpen = await details.evaluate(element => element.open);
  // Reset to the initial state so the next scenario starts clean (ULI-A05).
  if (afterSpaceOpen !== initialOpen) await details.evaluate((element, open) => { element.open = open; }, initialOpen);
  return { initialOpen, afterClickOpen, revealedHeight, afterEnterOpen, afterSpaceOpen };
}

/** Sequential Tab walk; returns control paths that received focus in the top document. */
export async function tabWalk(page, budget) {
  await page.evaluate(() => {
    document.activeElement?.blur?.();
    window.scrollTo(0, 0);
  });
  await page.locator("body").focus().catch(() => {});
  const reached = [];
  let firstPath = null;
  for (let press = 0; press < budget; press += 1) {
    await page.keyboard.press("Tab");
    const path = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return null;
      const parts = [];
      for (let node = element; node && node.nodeType === 1 && node !== document.documentElement; node = node.parentElement) {
        const tag = node.tagName.toLowerCase();
        if (node.id) {
          parts.unshift(`${tag}#${node.id}`);
          break;
        }
        const siblings = node.parentElement ? [...node.parentElement.children].filter(child => child.tagName === node.tagName) : [];
        parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${siblings.indexOf(node) + 1})` : tag);
      }
      return parts.join(" > ");
    });
    if (path === null) continue;
    if (path === firstPath && reached.length > 1) break;
    if (firstPath === null) firstPath = path;
    if (reached.at(-1) !== path) reached.push(path);
  }
  return reached;
}
