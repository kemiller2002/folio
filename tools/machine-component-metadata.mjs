import { elementNames } from "../src/components/register.js";

const base = Object.freeze({
  interaction: "document",
  identity: ["consumer-supplied-native-id", "semantic-child-structure"],
  actions: ["inspect", "follow-native-links-when-present"],
  state: ["attributes", "semantic-content"],
  completion: ["dom-content-available"]
});

export const machineComponentMetadata = Object.freeze(
  Object.fromEntries(elementNames.map(name => [name, base]))
);
