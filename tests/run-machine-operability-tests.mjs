import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium, firefox, webkit } from "playwright";
import { elementNames, registerPrintElements } from "../src/components/register.js";

const registrations = new Map();
registerPrintElements({
  get(name) {
    return registrations.get(name);
  },
  define(name, constructor) {
    registrations.set(name, constructor);
  }
});

assert.equal(registrations.size, elementNames.length, "all public Folio elements register through the passive light-DOM contract");

const semanticFixture = fs.readFileSync(
  path.join(process.cwd(), "tests/fixtures/accessibility/semantic.html"),
  "utf8"
);

const engines = [
  ["chromium", chromium],
  ["firefox", firefox],
  ["webkit", webkit]
];

for (const [name, engine] of engines) {
  const browser = await engine.launch({ headless: true });
  try {
    const page = await browser.newPage();

    await page.setContent(semanticFixture);
    assert.equal(await page.getByRole("heading", { name: "ACCESS-TITLE", level: 1 }).count(), 1, `${name}: semantic title is role-addressable`);
    assert.equal(await page.getByRole("heading", { name: "ACCESS-SECTION", level: 2 }).count(), 1, `${name}: semantic section heading is role-addressable`);
    assert.equal(await page.getByRole("table", { name: "ACCESS-TABLE" }).count(), 1, `${name}: native table keeps its semantic name`);
    assert.equal(await page.getByRole("img", { name: "Simple accessible diagram" }).count(), 1, `${name}: figure graphic keeps an accessible machine name`);

    await page.setContent(`<!doctype html>
<html lang="en">
<body>
  <ef-print-document id="statement-2026-10">
    <main>
      <h1>October statement</h1>
      <p><a href="#totals">View totals</a></p>
      <ef-print-section id="totals">
        <section aria-labelledby="totals-heading">
          <h2 id="totals-heading">Totals</h2>
          <p>Net total: 42</p>
        </section>
      </ef-print-section>
    </main>
  </ef-print-document>
</body>
</html>`);

    await page.evaluate((names) => {
      for (const elementName of names) {
        if (!customElements.get(elementName)) {
          customElements.define(elementName, class extends HTMLElement {});
        }
      }
    }, elementNames);

    assert.equal(await page.getByRole("heading", { name: "October statement", level: 1 }).count(), 1, `${name}: light-DOM content remains semantic after upgrade`);
    assert.equal(await page.locator("ef-print-document").getAttribute("id"), "statement-2026-10", `${name}: consumer document identity is preserved`);
    assert.equal(await page.locator("ef-print-section").getAttribute("id"), "totals", `${name}: consumer section identity is preserved`);

    await page.getByRole("link", { name: "View totals" }).click();
    assert.equal(new URL(page.url()).hash, "#totals", `${name}: native link reaches the stable semantic target`);
    assert.equal(await page.getByRole("heading", { name: "Totals", level: 2 }).count(), 1, `${name}: target content remains role-addressable`);

    const probes = elementNames.map((elementName, index) =>
      `<${elementName} id="machine-probe-${index}"><span data-machine-probe="${elementName}">${elementName} content</span></${elementName}>`
    ).join("");
    await page.setContent(`<!doctype html><html lang="en"><body>${probes}</body></html>`);
    await page.evaluate((names) => {
      for (const elementName of names) {
        if (!customElements.get(elementName)) customElements.define(elementName, class extends HTMLElement {});
      }
    }, elementNames);
    for (const [index, elementName] of elementNames.entries()) {
      const element = page.locator(elementName).first();
      assert.equal(await element.getAttribute("id"), `machine-probe-${index}`, `${name}: ${elementName} preserves supplied identity`);
      assert.equal(await element.locator("[data-machine-probe]").textContent(), `${elementName} content`, `${name}: ${elementName} preserves light-DOM content`);
      assert.equal(await element.evaluate(node => node.shadowRoot === null), true, `${name}: ${elementName} does not hide content behind Shadow DOM`);
    }
  } finally {
    await browser.close();
  }
}

console.log(`Folio machine-operability checks passed in ${engines.map(([name]) => name).join(", ")}.`);
