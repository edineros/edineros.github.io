import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DATABASE_NAME = 'portfolio.db';
const SCHEMA_VERSION = 6; // Increment when schema changes require migration

let db: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// For web, we use IndexedDB directly (see webDatabase.ts)
// This file is only used for native platforms

export function isWeb(): boolean {
  return Platform.OS === 'web';
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (isWeb()) {
    // On web, we don't use SQLite - return a dummy that will never be used
    // The db functions check isWeb() and use webDb instead
    throw new Error('SQLite not available on web - use webDb instead');
  }

  if (db) return db;

  // Prevent multiple simultaneous initialization attempts
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await initializeDatabase(db);
      return db;
    } catch (error) {
      console.error('Database initialization error:', error);
      dbInitPromise = null;
      throw error;
    }
  })();

  return dbInitPromise;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase) {
  await database.execAsync('PRAGMA journal_mode = WAL;');

  // Create schema version table if it doesn't exist
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
  `);

  // Get current schema version
  const versionResult = await database.getFirstAsync<{ version: number }>('SELECT version FROM schema_version LIMIT 1');
  const currentVersion = versionResult?.version ?? 0;

  if (currentVersion < SCHEMA_VERSION) {
    await runMigrations(database, currentVersion);
  }
}

async function runMigrations(database: SQLite.SQLiteDatabase, fromVersion: number) {
  // Migration from version 0 or 1 to version 2:
  // Remove CHECK constraint from assets.type to allow new asset types
  // without requiring database migrations for each new type

  if (fromVersion < 2) {
    await database.execAsync('PRAGMA foreign_keys = OFF;');

    await database.execAsync(`
      -- Create tables if they don't exist (fresh install)
      CREATE TABLE IF NOT EXISTS portfolios (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        currency TEXT DEFAULT 'EUR',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
        symbol TEXT NOT NULL,
        name TEXT,
        type TEXT NOT NULL,
        currency TEXT DEFAULT 'EUR',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        type TEXT CHECK(type IN ('buy','sell')) NOT NULL,
        quantity REAL NOT NULL,
        price_per_unit REAL NOT NULL,
        fee REAL DEFAULT 0,
        date INTEGER NOT NULL,
        notes TEXT,
        lot_id TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS price_cache (
        symbol TEXT PRIMARY KEY,
        asset_type TEXT,
        price REAL,
        currency TEXT,
        fetched_at INTEGER,
        expires_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS exchange_rates (
        from_currency TEXT NOT NULL,
        to_currency TEXT NOT NULL,
        rate REAL NOT NULL,
        fetched_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        PRIMARY KEY (from_currency, to_currency)
      );
    `);

    // Check if assets table has a CHECK constraint that needs to be removed
    // by recreating the table without it
    const tableInfo = await database.getAllAsync<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='assets'"
    );

    if (tableInfo.length > 0 && tableInfo[0].sql && tableInfo[0].sql.includes('CHECK')) {
      // Table has CHECK constraint - need to recreate it
      await database.execAsync(`
        -- Create new assets table without CHECK constraint
        CREATE TABLE assets_new (
          id TEXT PRIMARY KEY,
          portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
          symbol TEXT NOT NULL,
          name TEXT,
          type TEXT NOT NULL,
          currency TEXT DEFAULT 'EUR',
          created_at INTEGER NOT NULL
        );

        -- Copy existing data
        INSERT INTO assets_new SELECT * FROM assets;

        -- Drop old table and rename new one
        DROP TABLE assets;
        ALTER TABLE assets_new RENAME TO assets;
      `);
    }

    // Create indexes
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_assets_portfolio ON assets(portfolio_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_asset ON transactions(asset_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_price_cache_expires ON price_cache(expires_at);
    `);

    await database.execAsync('PRAGMA foreign_keys = ON;');
  }

  // Migration to version 3: Add masked column to portfolios
  if (fromVersion < 3) {
    // Check if column exists
    const columns = await database.getAllAsync<{ name: string }>(
      "PRAGMA table_info(portfolios)"
    );
    const hasValuesHidden = columns.some(col => col.name === 'masked');

    if (!hasValuesHidden) {
      await database.execAsync(
        'ALTER TABLE portfolios ADD COLUMN masked INTEGER DEFAULT 0'
      );
    }
  }

  // Migration to version 4: Add categories table and category_id to assets
  if (fromVersion < 4) {
    // Create categories table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `);

    // Add category_id column to assets
    const assetColumns = await database.getAllAsync<{ name: string }>(
      "PRAGMA table_info(assets)"
    );
    const hasCategoryId = assetColumns.some(col => col.name === 'category_id');

    if (!hasCategoryId) {
      await database.execAsync(
        'ALTER TABLE assets ADD COLUMN category_id TEXT REFERENCES categories(id) ON DELETE SET NULL'
      );
    }

    // Create index for category lookups
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id);
    `);
  }

  // Migration to version 5: Remove tags (no longer used)
  if (fromVersion < 5) {
    // Drop transaction_tags table if it exists
    await database.execAsync('DROP TABLE IF EXISTS transaction_tags;');

    // Remove tags column from assets if it exists
    // SQLite doesn't support DROP COLUMN directly, but we can ignore it
    // The column will just be unused going forward
  }

  // Migration to version 6: Rename 'real-estate' to 'realEstate'
  // TODO: Remove after 2026-02-20 once all devices have migrated
  if (fromVersion < 6) {
    await database.execAsync(
      "UPDATE assets SET type = 'realEstate' WHERE type = 'real-estate'"
    );
  }

  // Update schema version
  await database.execAsync('DELETE FROM schema_version;');
  await database.execAsync(`INSERT INTO schema_version (version) VALUES (${SCHEMA_VERSION});`);
}

export async function closeDatabase() {
  if (db) {
    await db.closeAsync();
    db = null;
    dbInitPromise = null;
  }
}

// No-op for web compatibility
export async function forceSaveWebDatabase() {
  // Only needed for old web implementation, now a no-op
}
