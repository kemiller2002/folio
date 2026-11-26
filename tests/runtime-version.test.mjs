import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { FOLIO_VERSION, installEchelonRuntimeRegistrar } from "../src/runtime.js";

const packageVersion = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const target = () => {
  const messages = { info: [], warn: [] };
  return {
    messages,
    console: {
      info: message => messages.info.push(message),
      warn: message => messages.warn.push(message)
    }
  };
};

test("generated Folio runtime version matches package metadata", () => {
  assert.equal(FOLIO_VERSION, packageVersion);
});

test("ECHELON-RUNTIME-1 is independent, idempotent, and order-insensitive", () => {
  const first = target();
  const register = installEchelonRuntimeRegistrar(first);
  register("forma", { version: "forma-contract-fixture" });
  register("folio", { version: FOLIO_VERSION });
  register("limen", { version: "limen-contract-fixture" });
  register("folio", { version: FOLIO_VERSION });

  assert.deepEqual(first.__ECHELON_RUNTIME__, {
    schemaVersion: 1,
    libraries: {
      forma: { version: "forma-contract-fixture" },
      folio: { version: packageVersion },
      limen: { version: "limen-contract-fixture" }
    }
  });
  assert.equal(first.messages.warn.length, 0);
  assert.equal(first.messages.info.length, 3);

  const second = target();
  const reverse = installEchelonRuntimeRegistrar(second);
  reverse("limen", { version: "limen-contract-fixture" });
  reverse("folio", { version: FOLIO_VERSION });
  reverse("forma", { version: "forma-contract-fixture" });
  assert.deepEqual(second.__ECHELON_RUNTIME__, first.__ECHELON_RUNTIME__);
});

test("conflicting registration warns and preserves the first version", () => {
  const browser = target();
  const register = installEchelonRuntimeRegistrar(browser);
  register("folio", { version: FOLIO_VERSION, secret: "not copied" });
  register("folio", { version: "99.0.0" });

  assert.deepEqual(browser.__ECHELON_RUNTIME__.libraries.folio, { version: packageVersion });
  assert.equal(browser.messages.warn.length, 1);
  assert.match(browser.messages.warn[0], /Folio .*already registered.*ignored v99\.0\.0/);
});

test("npm version regenerates the runtime stamp so prepack's freshness check passes", () => {
  // publish.yml sets a prerelease snapshot version with `npm version` and then packs;
  // the `version` lifecycle script must keep src/runtime-version.js in step with it.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "folio-runtime-version-"));
  try {
    const { name, version, scripts } = JSON.parse(fs.readFileSync("package.json", "utf8"));
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name, version, private: true, scripts }, null, 2));
    for (const file of ["tools/build-runtime-version.mjs", "src/runtime-version.js"]) {
      fs.mkdirSync(path.join(root, path.dirname(file)), { recursive: true });
      fs.copyFileSync(file, path.join(root, file));
    }
    const npm = (...args) => execFileSync("npm", args, { cwd: root, encoding: "utf8", stdio: "pipe" });
    const snapshot = `${version}-main.1.1`;
    npm("version", snapshot, "--no-git-tag-version");
    npm("run", "runtime:check");
    assert.match(fs.readFileSync(path.join(root, "src/runtime-version.js"), "utf8"), new RegExp(`FOLIO_VERSION = "${snapshot.replaceAll(".", "\\.")}"`));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
