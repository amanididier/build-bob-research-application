import { migrateLegacyWorkspace, LegacyMigrationReport } from './migrateLegacyWorkspace';
import {
  AsyncCanonicalWorkspaceRepository,
  createAsyncCanonicalWorkspaceStorage,
  migrateBrowserCanonicalStoreToNative,
  NativeMigrationResult,
  NativeWorkspaceStoreBridge,
} from './asyncCanonicalRepository';
import { KeyValueStorage } from './canonicalRepository';

export interface WorkspaceStorageInitialization {
  repository: AsyncCanonicalWorkspaceRepository;
  backend: 'native' | 'browser';
  legacyMigration: LegacyMigrationReport | null;
  nativeMigration: NativeMigrationResult | null;
}

/**
 * Initialize storage for the new async workspace surface.
 *
 * Legacy collections are imported into the browser canonical store first. On desktop,
 * that canonical snapshot is then copied into the dedicated native store with a backup.
 * The legacy keys and browser canonical source are never deleted. If the native store
 * already has content, the migration helper refuses to overwrite it and the native
 * store remains the repository used by the new workspace.
 */
export async function initializeWorkspaceStorage(options: {
  browserStorage?: KeyValueStorage | null;
  nativeBridge?: NativeWorkspaceStoreBridge | null;
  importLegacy?: boolean;
} = {}): Promise<WorkspaceStorageInitialization> {
  let browserStorage = options.browserStorage;
  if (browserStorage === undefined) {
    try {
      browserStorage = typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      browserStorage = null;
    }
  }

  const bridge = options.nativeBridge ?? (
    typeof window !== 'undefined'
      ? (window as Window & { bob?: NativeWorkspaceStoreBridge }).bob
      : undefined
  );
  const hasNativeBridge = Boolean(bridge?.workspaceStoreRead && bridge?.workspaceStoreWrite);

  let legacyMigration: LegacyMigrationReport | null = null;
  if (options.importLegacy !== false && browserStorage && !hasNativeBridge) {
    // The legacy migration uses the canonical singleton; ensure it sees the provided
    // browser store in tests and nonstandard embeds before importing.
    legacyMigration = migrateLegacyWorkspace();
  } else if (options.importLegacy !== false && browserStorage && hasNativeBridge) {
    legacyMigration = migrateLegacyWorkspace();
  }

  const storage = createAsyncCanonicalWorkspaceStorage(browserStorage, bridge);
  let nativeMigration: NativeMigrationResult | null = null;
  if (hasNativeBridge && browserStorage) {
    nativeMigration = await migrateBrowserCanonicalStoreToNative(storage, browserStorage);
  }

  return {
    repository: new AsyncCanonicalWorkspaceRepository(storage),
    backend: hasNativeBridge ? 'native' : 'browser',
    legacyMigration,
    nativeMigration,
  };
}
