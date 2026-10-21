export interface EchelonRuntimeMetadata {
  version: string;
  commit?: string;
  buildTime?: string;
}

export interface EchelonRuntimeRegistry {
  schemaVersion: 1;
  libraries: Record<string, EchelonRuntimeMetadata>;
}

export interface EchelonRuntimeRegistrar {
  (name: string, metadata: EchelonRuntimeMetadata): EchelonRuntimeMetadata;
  readonly echelonRuntimeSchemaVersion: 1;
}

export declare function installEchelonRuntimeRegistrar(target?: typeof globalThis): EchelonRuntimeRegistrar | undefined;
export declare function registerEchelonRuntime(name: string, metadata: EchelonRuntimeMetadata, target?: typeof globalThis): EchelonRuntimeMetadata | undefined;
export declare const FOLIO_VERSION: string;

declare global {
  interface Window {
    __ECHELON_RUNTIME__?: EchelonRuntimeRegistry;
    __ECHELON_REGISTER_RUNTIME__?: EchelonRuntimeRegistrar;
  }
}
