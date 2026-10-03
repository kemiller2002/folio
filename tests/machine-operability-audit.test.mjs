import test from "node:test";
import assert from "node:assert/strict";
import { coreComponentMetadata } from "../tools/core-component-metadata.mjs";
import { elementNames } from "../src/components/register.js";

test("every registered Folio primitive has machine metadata", () => {
  for (const name of elementNames) {
    const metadata = coreComponentMetadata[name];
    assert.ok(metadata, `${name} metadata exists`);
    assert.equal(metadata.machine?.interaction, "document", `${name} is a document primitive`);
    for (const field of ["identity", "actions", "state", "completion"]) {
      assert.ok(Array.isArray(metadata.machine?.[field]) && metadata.machine[field].length > 0, `${name} machine.${field}`);
    }
  }
});

test("Folio metadata does not expose unregistered print primitives", () => {
  const unregistered = Object.keys(coreComponentMetadata).filter(name => !elementNames.includes(name));
  assert.deepEqual(unregistered, []);
});
