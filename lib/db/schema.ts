import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DATABASE_NAME = 'portfolio.db';

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
  await database.execAsync(`
    PRAGMA foreign_keys = ON;

    -- Portfolios
    CREATE TABLE IF NOT EXISTS portfolios (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      currency TEXT DEFAULT 'EUR',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Assets
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      portfolio_id TEXT NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      name TEXT,
      type TEXT CHECK(type IN ('stock','etf','crypto','bond','commodity','forex','cash','other')) NOT NULL,
      currency TEXT DEFAULT 'EUR',
      created_at INTEGER NOT NULL
    );

    -- Transactions
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

    -- Tags (many-to-many)
    CREATE TABLE IF NOT EXISTS transaction_tags (
      transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      PRIMARY KEY (transaction_id, tag)
    );

    -- Price Cache
    CREATE TABLE IF NOT EXISTS price_cache (
      symbol TEXT PRIMARY KEY,
      asset_type TEXT,
      price REAL,
      currency TEXT,
      fetched_at INTEGER,
      expires_at INTEGER
    );

    -- Exchange Rates Cache
    CREATE TABLE IF NOT EXISTS exchange_rates (
      from_currency TEXT NOT NULL,
      to_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      fetched_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      PRIMARY KEY (from_currency, to_currency)
    );

    -- Create indexes for faster queries
    CREATE INDEX IF NOT EXISTS idx_assets_portfolio ON assets(portfolio_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_asset ON transactions(asset_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_price_cache_expires ON price_cache(expires_at);
  `);
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
