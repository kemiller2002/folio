import test from "node:test";
import assert from "node:assert/strict";
import { elementNames } from "../src/components/register.js";
import { machineComponentMetadata } from "../tools/machine-component-metadata.mjs";

test("every registered Folio primitive has machine metadata", () => {
  for (const name of elementNames) {
    const metadata = machineComponentMetadata[name];
    assert.ok(metadata, `${name} metadata exists`);
    assert.equal(metadata.interaction, "document", `${name} is a document primitive`);
    for (const field of ["identity", "actions", "state", "completion"]) {
      assert.ok(Array.isArray(metadata[field]) && metadata[field].length > 0, `${name} machine.${field}`);
    }
  }
});

test("machine metadata has no unregistered print primitives", () => {
  const unregistered = Object.keys(machineComponentMetadata).filter(name => !elementNames.includes(name));
  assert.deepEqual(unregistered, []);
});
