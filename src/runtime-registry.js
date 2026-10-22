const SCHEMA_VERSION = 1;
const REGISTRY_KEY = "__ECHELON_RUNTIME__";
const REGISTER_KEY = "__ECHELON_REGISTER_RUNTIME__";

const libraryLabel = name => name
  .split("-")
  .map(part => part ? part[0].toUpperCase() + part.slice(1) : part)
  .join(" ");
const diagnostic = (target, method, message) => target.console?.[method]?.(message);

export function installEchelonRuntimeRegistrar(target = globalThis) {
  const installed = target[REGISTER_KEY];
  if (typeof installed === "function" && installed.echelonRuntimeSchemaVersion === SCHEMA_VERSION) return installed;
  if (installed !== undefined) {
    diagnostic(target, "warn", "Echelon Runtime registrar conflict: an incompatible global registrar is already installed.");
    return undefined;
  }

  let registry = target[REGISTRY_KEY];
  if (registry === undefined) {
    registry = { schemaVersion: SCHEMA_VERSION, libraries: {} };
    target[REGISTRY_KEY] = registry;
  } else if (registry === null || typeof registry !== "object" || registry.schemaVersion !== SCHEMA_VERSION || registry.libraries === null || typeof registry.libraries !== "object") {
    diagnostic(target, "warn", "Echelon Runtime registry conflict: schemaVersion 1 is required; the existing registry was left unchanged.");
    return undefined;
  }

  const register = (name, metadata) => {
    if (typeof name !== "string" || !/^[a-z][a-z0-9-]*$/.test(name)) throw new TypeError("Echelon runtime library names must be lowercase identifiers.");
    if (metadata === null || typeof metadata !== "object" || typeof metadata.version !== "string" || metadata.version.length === 0) throw new TypeError("Echelon runtime metadata requires a version string.");

    const candidate = { version: metadata.version };
    if (typeof metadata.commit === "string" && metadata.commit.length > 0) candidate.commit = metadata.commit;
    if (typeof metadata.buildTime === "string" && metadata.buildTime.length > 0) candidate.buildTime = metadata.buildTime;

    const current = registry.libraries[name];
    if (current !== undefined) {
      if (current.version === candidate.version) return current;
      diagnostic(target, "warn", `Echelon Runtime conflict: ${libraryLabel(name)} v${current.version} is already registered; ignored v${candidate.version}.`);
      return current;
    }

    registry.libraries[name] = candidate;
    diagnostic(target, "info", `Echelon Runtime · ${libraryLabel(name)} v${candidate.version}`);
    return candidate;
  };

  Object.defineProperty(register, "echelonRuntimeSchemaVersion", { value: SCHEMA_VERSION });
  Object.defineProperty(target, REGISTER_KEY, { value: register, configurable: true });
  return register;
}

export function registerEchelonRuntime(name, metadata, target = globalThis) {
  return installEchelonRuntimeRegistrar(target)?.(name, metadata);
}
