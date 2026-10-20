import { migrateLegacyWorkspace, LegacyMigrationReport } from './migrateLegacyWorkspace';
import {
  AsyncCanonicalWorkspaceRepository,
  createAsyncCanonicalWorkspaceStorage,
  migrateBrowserCanonicalStoreToNative,
  NativeMigrationResult,
  NativeWorkspaceStoreBridge,
} from './asyncCanonicalRepository';
import { CanonicalWorkspaceRepository, KeyValueStorage } from './canonicalRepository';

export class WorkspaceStorageConflictError extends Error {
  readonly result: NativeMigrationResult;

  constructor(result: NativeMigrationResult) {
    super('The native workspace already contains different data. Startup was stopped to prevent hiding or overwriting workspace records. Preserve both stores and resolve the migration conflict before opening the main workspace.');
    this.name = 'WorkspaceStorageConflictError';
    this.result = result;
  }
}

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
  if (options.importLegacy !== false && browserStorage) {
    // Bind the import to the exact browser adapter selected by this initializer.
    // This keeps injected/test storage and real browser storage behavior identical.
    const browserRepository = new CanonicalWorkspaceRepository(browserStorage);
    legacyMigration = migrateLegacyWorkspace({ storage: browserStorage, repository: browserRepository });
  }

  const storage = createAsyncCanonicalWorkspaceStorage(browserStorage, bridge);
  let nativeMigration: NativeMigrationResult | null = null;
  if (hasNativeBridge && browserStorage) {
    nativeMigration = await migrateBrowserCanonicalStoreToNative(storage, browserStorage);
    if (nativeMigration.status === 'native-store-not-empty') {
      // Never let a caller accidentally render a partial native workspace while browser
      // records are stranded in the legacy store. The caller must present recovery.
      throw new WorkspaceStorageConflictError(nativeMigration);
    }
  }

  return {
    repository: new AsyncCanonicalWorkspaceRepository(storage),
    backend: hasNativeBridge ? 'native' : 'browser',
    legacyMigration,
    nativeMigration,
  };
}
