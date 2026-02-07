// Pure IndexedDB implementation for web platform
// Bypasses expo-sqlite entirely to avoid OPFS issues

import type { Asset, Category } from '../types';

const DB_NAME = 'portfolio-tracker';
const DB_VERSION = 7;

let idb: IDBDatabase | null = null;
let idbPromise: Promise<IDBDatabase> | null = null;
let dataMigrationDone = false;

async function openIDB(): Promise<IDBDatabase> {
  if (idb) return idb;
  if (idbPromise) return idbPromise;

  idbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      idbPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => {
      idb = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores with indexes
      if (!db.objectStoreNames.contains('portfolios')) {
        const portfolios = db.createObjectStore('portfolios', { keyPath: 'id' });
        portfolios.createIndex('created_at', 'created_at');
      }

      if (!db.objectStoreNames.contains('assets')) {
        const assets = db.createObjectStore('assets', { keyPath: 'id' });
        assets.createIndex('portfolio_id', 'portfolio_id');
        assets.createIndex('symbol', 'symbol');
      }

      if (!db.objectStoreNames.contains('transactions')) {
        const transactions = db.createObjectStore('transactions', { keyPath: 'id' });
        transactions.createIndex('asset_id', 'asset_id');
        transactions.createIndex('date', 'date');
      }

      if (!db.objectStoreNames.contains('price_cache')) {
        db.createObjectStore('price_cache', { keyPath: 'symbol' });
      }

      if (!db.objectStoreNames.contains('exchange_rates')) {
        db.createObjectStore('exchange_rates', { keyPath: ['from_currency', 'to_currency'] });
      }

      if (!db.objectStoreNames.contains('categories')) {
        const categories = db.createObjectStore('categories', { keyPath: 'id' });
        categories.createIndex('name', 'name', { unique: true });
        categories.createIndex('sort_order', 'sort_order');
      }

      // Remove deprecated transaction_tags store if it exists
      if (db.objectStoreNames.contains('transaction_tags')) {
        db.deleteObjectStore('transaction_tags');
      }
    };
  });

  const db = await idbPromise;

  // Run data migrations after database is open
  if (!dataMigrationDone) {
    await runDataMigrations(db);
    dataMigrationDone = true;
  }

  return db;
}

/**
 * Generate a short ID for migration purposes.
 * Uses an incrementing counter to ensure uniqueness within a migration run.
 */
let migrationCounter = 0;
function generateShortId(): string {
  const time = Date.now().toString(36).slice(-6);
  const counter = (migrationCounter++).toString(36).padStart(4, '0').slice(0, 4);
  return time + counter;
}

// Data migrations that can't be done in onupgradeneeded
async function runDataMigrations(db: IDBDatabase): Promise<void> {
  // Migration: Rename 'real-estate' to 'realEstate'
  // TODO: Remove after 2026-02-20 once all devices have migrated
  await migrateRealEstateType(db);

  // Migration: Convert UUID to short IDs
  // TODO: Remove after 2026-03-15 once all devices have migrated
  await migrateToShortIds(db);
}

async function migrateRealEstateType(db: IDBDatabase): Promise<void> {
  const tx = db.transaction('assets', 'readwrite');
  const store = tx.objectStore('assets');
  const request = store.getAll();

  await new Promise<void>((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      const assets = request.result;
      for (const asset of assets) {
        if (asset.type === 'real-estate') {
          asset.type = 'realEstate';
          store.put(asset);
        }
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  });
}

/**
 * Check if an ID looks like a UUID (36 chars with dashes).
 */
function isUUID(id: string): boolean {
  return typeof id === 'string' && id.length === 36 && id.includes('-');
}

/**
 * Migrate UUIDs to short IDs for all tables.
 * Only migrates records that have UUID-format IDs.
 */
async function migrateToShortIds(db: IDBDatabase): Promise<void> {
  // Build ID mappings first
  const portfolioIdMap = new Map<string, string>();
  const categoryIdMap = new Map<string, string>();
  const assetIdMap = new Map<string, string>();
  const transactionIdMap = new Map<string, string>();

  // Read all records
  const portfolios = await getAllFromStore(db, 'portfolios');
  const categories = await getAllFromStore(db, 'categories');
  const assets = await getAllFromStore(db, 'assets');
  const transactions = await getAllFromStore(db, 'transactions');

  // Check if migration is needed (at least one UUID exists)
  const hasUUIDs = [...portfolios, ...categories, ...assets, ...transactions].some(
    (record: any) => isUUID(record.id)
  );
  if (!hasUUIDs) {
    return; // Already migrated
  }

  // Generate new IDs for UUID records
  for (const p of portfolios) {
    if (isUUID(p.id)) {
      portfolioIdMap.set(p.id, generateShortId());
    }
  }
  for (const c of categories) {
    if (isUUID(c.id)) {
      categoryIdMap.set(c.id, generateShortId());
    }
  }
  for (const a of assets) {
    if (isUUID(a.id)) {
      assetIdMap.set(a.id, generateShortId());
    }
  }
  for (const t of transactions) {
    if (isUUID(t.id)) {
      transactionIdMap.set(t.id, generateShortId());
    }
  }

  // Migrate portfolios
  for (const portfolio of portfolios) {
    const newId = portfolioIdMap.get(portfolio.id);
    if (newId) {
      await deleteFromStore(db, 'portfolios', portfolio.id);
      portfolio.id = newId;
      await putToStore(db, 'portfolios', portfolio);
    }
  }

  // Migrate categories
  for (const category of categories) {
    const newId = categoryIdMap.get(category.id);
    if (newId) {
      await deleteFromStore(db, 'categories', category.id);
      category.id = newId;
      await putToStore(db, 'categories', category);
    }
  }

  // Migrate assets (update id, portfolio_id, category_id)
  for (const asset of assets) {
    const newId = assetIdMap.get(asset.id);
    const newPortfolioId = portfolioIdMap.get(asset.portfolio_id);
    const newCategoryId = asset.category_id ? categoryIdMap.get(asset.category_id) : null;

    if (newId || newPortfolioId || newCategoryId) {
      await deleteFromStore(db, 'assets', asset.id);
      if (newId) {
        asset.id = newId;
      }
      if (newPortfolioId) {
        asset.portfolio_id = newPortfolioId;
      }
      if (newCategoryId) {
        asset.category_id = newCategoryId;
      }
      await putToStore(db, 'assets', asset);
    }
  }

  // Migrate transactions (update id, asset_id, lot_id)
  for (const transaction of transactions) {
    const newId = transactionIdMap.get(transaction.id);
    const newAssetId = assetIdMap.get(transaction.asset_id);
    const newLotId = transaction.lot_id ? transactionIdMap.get(transaction.lot_id) : null;

    if (newId || newAssetId || newLotId) {
      await deleteFromStore(db, 'transactions', transaction.id);
      if (newId) {
        transaction.id = newId;
      }
      if (newAssetId) {
        transaction.asset_id = newAssetId;
      }
      if (newLotId) {
        transaction.lot_id = newLotId;
      }
      await putToStore(db, 'transactions', transaction);
    }
  }
}

async function getAllFromStore(db: IDBDatabase, storeName: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function deleteFromStore(db: IDBDatabase, storeName: string, key: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function putToStore(db: IDBDatabase, storeName: string, data: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(data);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Generic CRUD operations
async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getAllByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getOne<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

async function put<T>(storeName: string, data: T): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(data);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function remove(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function removeByIndex(storeName: string, indexName: string, value: IDBValidKey): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.openCursor(value);

    request.onerror = () => reject(request.error);
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
  });
}

function rowToAsset(row: any): Asset {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    symbol: row.symbol,
    name: row.name,
    type: row.type,
    currency: row.currency,
    categoryId: row.category_id ?? null,
    createdAt: new Date(row.created_at),
  };
}

// Database operations
export const webDb = {
  // Portfolios
  async getAllPortfolios() {
    const portfolios = await getAll<any>('portfolios');
    return portfolios.sort((a, b) => b.created_at - a.created_at);
  },

  async getPortfolioById(id: string) {
    return getOne<any>('portfolios', id);
  },

  async createPortfolio(portfolio: any) {
    await put('portfolios', portfolio);
  },

  async updatePortfolio(portfolio: any) {
    await put('portfolios', portfolio);
  },

  async deletePortfolio(id: string) {
    const assets = await this.getAssetsByPortfolioId(id);
    for (const asset of assets) {
      await this.deleteAsset(asset.id);
    }
    await remove('portfolios', id);
  },

  // Assets
  async getAssetsByPortfolioId(portfolioId: string): Promise<Asset[]> {
    const assets = await getAllByIndex<any>('assets', 'portfolio_id', portfolioId);
    return assets.map(rowToAsset).sort((a, b) => a.symbol.localeCompare(b.symbol));
  },

  async getAllAssets(): Promise<Asset[]> {
    const assets = await getAll<any>('assets');
    return assets.map(rowToAsset).sort((a, b) => a.symbol.localeCompare(b.symbol));
  },

  async getAssetById(id: string): Promise<Asset | null> {
    const row = await getOne<any>('assets', id);
    return row ? rowToAsset(row) : null;
  },

  async getAssetBySymbol(portfolioId: string, symbol: string): Promise<Asset | null> {
    const assets = await this.getAssetsByPortfolioId(portfolioId);
    return assets.find(a => a.symbol === symbol) || null;
  },

  async createAsset(asset: any) {
    await put('assets', asset);
  },

  async updateAsset(asset: any) {
    await put('assets', asset);
  },

  async deleteAsset(id: string) {
    await removeByIndex('transactions', 'asset_id', id);
    await remove('assets', id);
  },

  // Transactions
  async getTransactionsByAssetId(assetId: string) {
    const transactions = await getAllByIndex<any>('transactions', 'asset_id', assetId);
    return transactions.sort((a, b) => b.date - a.date);
  },

  async getTransactionById(id: string) {
    return getOne<any>('transactions', id);
  },

  async createTransaction(transaction: any) {
    await put('transactions', transaction);
  },

  async updateTransaction(id: string, updates: any) {
    const existing = await this.getTransactionById(id);
    if (!existing) {
      return;
    }

    const updated = { ...existing, ...updates };
    await put('transactions', updated);
  },

  async deleteTransaction(id: string): Promise<boolean> {
    await remove('transactions', id);
    return true;
  },

  // Categories
  async getAllCategories(): Promise<Category[]> {
    const categories = await getAll<any>('categories');
    return categories
      .map((row: any) => ({
        id: row.id,
        name: row.name,
        color: row.color,
        sortOrder: row.sort_order,
        createdAt: new Date(row.created_at),
      }))
      .sort((a: Category, b: Category) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return a.name.localeCompare(b.name);
      });
  },

  async getCategoryById(id: string): Promise<Category | null> {
    const row = await getOne<any>('categories', id);
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      sortOrder: row.sort_order,
      createdAt: new Date(row.created_at),
    };
  },

  async createCategory(category: any): Promise<void> {
    await put('categories', category);
  },

  async updateCategory(category: any): Promise<void> {
    await put('categories', category);
  },

  async deleteCategory(id: string): Promise<void> {
    // Update assets that reference this category to have null category_id
    const assets = await getAll<any>('assets');
    for (const asset of assets) {
      if (asset.category_id === id) {
        await put('assets', { ...asset, category_id: null });
      }
    }
    await remove('categories', id);
  },
};
