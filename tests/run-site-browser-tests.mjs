import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium, firefox, webkit } from "playwright";

const root = process.cwd();
const site = path.join(root, "site-dist");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((request, response) => {
      const url = new URL(request.url, "http://127.0.0.1");
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const target = path.normalize(path.join(site, pathname.replace(/^\//, "")));

      if (!target.startsWith(site) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(200, { "content-type": mime[path.extname(target)] ?? "application/octet-stream" });
      fs.createReadStream(target).pipe(response);
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, baseURL: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function assertNoPageOverflow(page, label) {
  const result = await page.evaluate(() => {
    const client = document.documentElement.clientWidth;
    const scroll = document.documentElement.scrollWidth;
    const offenders = [...document.querySelectorAll("*")]
      .map(element => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          cls: element.className || "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width)
        };
      })
      .filter(item => item.right > client + 1 || item.left < -1)
      .slice(0, 8);
    return { scroll, client, offenders };
  });
  assert.ok(
    result.scroll <= result.client + 1,
    `${label}: page-level horizontal overflow (${result.scroll} > ${result.client}); offenders=${JSON.stringify(result.offenders)}`
  );
}

async function assertMinTarget(page, locator, minimum, label) {
  const box = await locator.boundingBox();
  assert.ok(box, `${label}: target has a box`);
  assert.ok(box.height >= minimum - 0.5, `${label}: target height ${box.height}px is below ${minimum}px`);
}

const { server, baseURL } = await serve();
const engines = [
  ["chromium", chromium],
  ["firefox", firefox],
  ["webkit", webkit]
];
const phoneWidths = [320, 390, 430];
const siteManifest = JSON.parse(fs.readFileSync(path.join(site, "site-manifest.json"), "utf8"));
const mobileRoutes = [
  "/",
  "/capabilities/",
  "/agents/",
  "/reports/signal-results/",
  "/reports/signal-results/preview.html",
  ...siteManifest.components.map(component => `/components/${component.slug}/`),
  ...siteManifest.components.map(component => `/demos/${component.slug}/1.html`),
  "/profiles/",
  ...siteManifest.profileExamples.flatMap(profile => [`/profiles/${profile.slug}/`, `/profiles/${profile.slug}/preview.html`]),
  "/journals/",
  ...siteManifest.journalExamples.flatMap(journal => [`/journals/${journal.slug}/`, `/journals/${journal.slug}/preview.html`]),
  ...siteManifest.recipes.flatMap(recipe => [`/recipes/${recipe.slug}/`, `/demos/${recipe.demoSlug}/1.html`, `/demos/${recipe.demoSlug}/2.html`, `/demos/${recipe.demoSlug}/3.html`])
];

try {
  for (const [name, engine] of engines) {
    const browser = await engine.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    await page.goto(baseURL + "/");
    assert.equal(await page.locator("h1").textContent(), "Folio", `${name}: home title`);
    assert.equal(await page.locator("#components .component-card").count(), siteManifest.componentCount, `${name}: component count`);
    assert.equal(await page.locator("#recipes .component-card").count(), siteManifest.recipeCount, `${name}: recipe count`);

    await page.goto(baseURL + "/components/columns/");
    assert.equal(await page.locator("[data-example]").count(), 3, `${name}: three examples`);
    assert.match(await page.locator(".contract-grid").innerText(), /P0 portable/i);
    assert.match(await page.locator(".preview-note").first().innerText(), /narrow screens/i, `${name}: mobile preview guidance`);

    const preview = page.frameLocator("iframe").first();
    const columns = preview.locator("ef-print-columns");
    await columns.waitFor({ state: "attached" });
    const columnCount = await columns.evaluate(element => getComputedStyle(element).columnCount);
    assert.equal(columnCount, "2", `${name}: Folio print CSS applied inside desktop preview`);

    await page.goto(baseURL + "/components/sidebar/");
    assert.match(await page.locator(".warning").innerText(), /provisional/i, `${name}: capability caveat visible`);

    await page.goto(baseURL + "/reports/signal-results/");
    assert.match(await page.locator("h1").innerText(), /Signal results report/i, `${name}: report example title`);
    const reportPreview = page.frameLocator("iframe").first();
    await reportPreview.locator("ef-print-integrity").first().waitFor({state: "attached"});
    assert.equal(await reportPreview.locator("ef-print-metric").count() >= 4, true, `${name}: report preview exposes metrics`);

    await page.goto(baseURL + "/profiles/");
    assert.match(await page.locator("h1").innerText(), /Resume and professional profile/i, `${name}: profile family title`);
    for (const profile of siteManifest.profileExamples) {
      await page.goto(baseURL + `/profiles/${profile.slug}/`);
      const profilePreview = page.frameLocator("iframe").first();
      const rowEnd = profilePreview.locator(".ef-row > [data-row-end]").first();
      await rowEnd.waitFor({state: "attached"});
      assert.equal(await rowEnd.evaluate(element => getComputedStyle(element).whiteSpace), "nowrap", `${name}: ${profile.id} preview applies Folio recipes`);
      assert.match(await page.locator("details pre").textContent(), /class="ef-row"/, `${name}: ${profile.id} exposes semantic source`);
    }

    await page.goto(baseURL + "/agents/");
    assert.match(await page.locator("h1").innerText(), /not a pagination engine/i, `${name}: agent boundary`);
    assert.equal(await page.locator(".instruction-card").count(), 4, `${name}: mobile instruction cards`);

    for (const width of phoneWidths) {
      await page.setViewportSize({ width, height: 844 });

      for (const route of mobileRoutes) {
        await page.emulateMedia({ media: "screen" });
        await page.goto(baseURL + route);
        await assertNoPageOverflow(page, `${name} ${width}px ${route}`);
      }

      await page.goto(baseURL + "/");
      const brandBox = await page.locator(".brand").boundingBox();
      const navBox = await page.locator(".site-nav").boundingBox();
      assert.ok(brandBox && navBox, `${name} ${width}px: header boxes available`);
      assert.ok(navBox.y >= brandBox.y + brandBox.height - 1, `${name} ${width}px: primary nav follows brand without overlap`);
      for (let index = 0; index < await page.locator(".site-nav a").count(); index += 1) {
        await assertMinTarget(page, page.locator(".site-nav a").nth(index), 44, `${name} ${width}px primary nav ${index}`);
      }

      await page.goto(baseURL + "/components/columns/");
      await assertNoPageOverflow(page, `${name} ${width}px columns component`);
      const componentNav = page.locator(".component-nav ul");
      const navMetrics = await componentNav.evaluate(element => ({
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth
      }));
      assert.ok(navMetrics.scrollWidth >= navMetrics.clientWidth, `${name} ${width}px: component nav remains horizontally navigable`);
      await assertMinTarget(page, page.locator(".component-nav a").first(), 44, `${name} ${width}px component nav target`);
      await assertMinTarget(page, page.locator(".example-actions a").first(), 44, `${name} ${width}px example action`);
      const frameBox = await page.locator(".print-preview iframe").first().boundingBox();
      assert.ok(frameBox && frameBox.width <= width + 1, `${name} ${width}px: preview iframe fits viewport`);
      const codeMetrics = await page.locator(".example-block pre").first().evaluate(element => ({
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth
      }));
      assert.ok(codeMetrics.clientWidth > 0, `${name} ${width}px: code sample is visible`);

      await page.goto(baseURL + "/capabilities/");
      await assertNoPageOverflow(page, `${name} ${width}px capabilities`);
      const capabilityTable = page.locator(".table-scroll").first();
      const capabilityMetrics = await capabilityTable.evaluate(element => ({
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth
      }));
      assert.ok(capabilityMetrics.scrollWidth >= capabilityMetrics.clientWidth, `${name} ${width}px: capability table scroll is contained`);

      await page.goto(baseURL + "/agents/");
      await assertNoPageOverflow(page, `${name} ${width}px agents`);
      const instructionColumns = await page.locator(".instruction-grid").evaluate(element =>
        getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length
      );
      assert.equal(instructionColumns, 1, `${name} ${width}px: instruction cards stack to one column`);
      const ownershipTable = page.locator(".table-scroll").first();
      await ownershipTable.focus();
      assert.equal(await ownershipTable.getAttribute("tabindex"), "0", `${name} ${width}px: ownership table is keyboard-scrollable`);

      await page.goto(baseURL + "/demos/columns/1.html");
      await page.emulateMedia({ media: "screen" });
      const mobileColumnCount = await page.locator("ef-print-columns").evaluate(element => getComputedStyle(element).columnCount);
      assert.equal(mobileColumnCount, "1", `${name} ${width}px: mobile screen inspection collapses columns`);
      await assertNoPageOverflow(page, `${name} ${width}px standalone columns demo`);

      await page.emulateMedia({ media: "print" });
      const printColumnCount = await page.locator("ef-print-columns").evaluate(element => getComputedStyle(element).columnCount);
      assert.equal(printColumnCount, "2", `${name} ${width}px: print media keeps Folio column contract`);

      await page.emulateMedia({ media: "screen" });
      for (const profile of siteManifest.profileExamples) {
        await page.goto(baseURL + `/profiles/${profile.slug}/preview.html`);
        const stacked = await page.locator(".ef-row").first().evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length);
        assert.equal(stacked, 1, `${name} ${width}px: ${profile.id} rows stack on phones`);
        await page.emulateMedia({ media: "print" });
        const printTracks = await page.locator(".ef-row").first().evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length);
        assert.equal(printTracks, 2, `${name} ${width}px: ${profile.id} print media restores aligned rows`);
        await page.emulateMedia({ media: "screen" });
      }

      await page.goto(baseURL + "/demos/sidebar/1.html");
      const mobileSidebarTracks = await page.locator("ef-print-sidebar").evaluate(element =>
        getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length
      );
      assert.equal(mobileSidebarTracks, 1, `${name} ${width}px: mobile screen inspection collapses sidebar`);
      await assertNoPageOverflow(page, `${name} ${width}px standalone sidebar demo`);

      await page.emulateMedia({ media: "print" });
      const printSidebarTracks = await page.locator("ef-print-sidebar").evaluate(element =>
        getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length
      );
      assert.ok(printSidebarTracks >= 2, `${name} ${width}px: print media restores side-rail columns`);
    }

    await browser.close();
  }

  console.log(`Folio site browser checks passed at desktop and 320/390/430px in ${engines.map(([engineName]) => engineName).join(", ")}.`);
} finally {
  await new Promise(resolve => server.close(resolve));
}
