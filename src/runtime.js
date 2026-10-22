import { registerEchelonRuntime } from "./runtime-registry.js";
import { FOLIO_VERSION } from "./runtime-version.js";

export { installEchelonRuntimeRegistrar, registerEchelonRuntime } from "./runtime-registry.js";
export { FOLIO_VERSION } from "./runtime-version.js";

if (typeof window !== "undefined") registerEchelonRuntime("folio", { version: FOLIO_VERSION }, window);
