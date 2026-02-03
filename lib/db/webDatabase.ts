// Pure IndexedDB implementation for web platform
// Bypasses expo-sqlite entirely to avoid OPFS issues

import type { Asset } from '../types';

const DB_NAME = 'portfolio-tracker';
const DB_VERSION = 3;

let idb: IDBDatabase | null = null;
let idbPromise: Promise<IDBDatabase> | null = null;

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

      if (!db.objectStoreNames.contains('transaction_tags')) {
        db.createObjectStore('transaction_tags', { keyPath: ['transaction_id', 'tag'] });
      }

      if (!db.objectStoreNames.contains('price_cache')) {
        db.createObjectStore('price_cache', { keyPath: 'symbol' });
      }

      if (!db.objectStoreNames.contains('exchange_rates')) {
        db.createObjectStore('exchange_rates', { keyPath: ['from_currency', 'to_currency'] });
      }
    };
  });

  return idbPromise;
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
    tags: row.tags || [],
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

  // Assets (tags stored directly in asset object)
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

  async getAllAssetTags(): Promise<string[]> {
    const assets = await getAll<any>('assets');
    const allTags = new Set<string>();
    for (const asset of assets) {
      for (const tag of asset.tags || []) {
        allTags.add(tag);
      }
    }
    return Array.from(allTags).sort();
  },

  // Transactions
  async getTransactionsByAssetId(assetId: string) {
    const transactions = await getAllByIndex<any>('transactions', 'asset_id', assetId);
    for (const tx of transactions) {
      tx.tags = await this.getTagsForTransaction(tx.id);
    }
    return transactions.sort((a, b) => b.date - a.date);
  },

  async getTransactionById(id: string) {
    const tx = await getOne<any>('transactions', id);
    if (tx) {
      tx.tags = await this.getTagsForTransaction(id);
    }
    return tx;
  },

  async createTransaction(transaction: any) {
    const tags = transaction.tags || [];
    delete transaction.tags;
    await put('transactions', transaction);
    for (const tag of tags) {
      await put('transaction_tags', { transaction_id: transaction.id, tag });
    }
  },

  async updateTransaction(id: string, updates: any) {
    const existing = await this.getTransactionById(id);
    if (!existing) {
      return;
    }

    const tags = updates.tags;
    delete updates.tags;

    const updated = { ...existing, ...updates };
    delete updated.tags;
    await put('transactions', updated);

    if (tags !== undefined) {
      const oldTags = await this.getTagsForTransaction(id);
      for (const tag of oldTags) {
        await remove('transaction_tags', [id, tag]);
      }
      for (const tag of tags) {
        await put('transaction_tags', { transaction_id: id, tag });
      }
    }
  },

  async deleteTransaction(id: string): Promise<boolean> {
    const tags = await this.getTagsForTransaction(id);
    for (const tag of tags) {
      await remove('transaction_tags', [id, tag]);
    }
    await remove('transactions', id);
    return true;
  },

  async getTagsForTransaction(transactionId: string): Promise<string[]> {
    const allTags = await getAll<any>('transaction_tags');
    return allTags
      .filter(t => t.transaction_id === transactionId)
      .map(t => t.tag);
  },

  async getAllTags(): Promise<string[]> {
    const allTags = await getAll<any>('transaction_tags');
    return [...new Set(allTags.map(t => t.tag))].sort();
  },

  // Price cache
  async getCachedPrice(symbol: string) {
    return getOne<any>('price_cache', symbol);
  },

  async setCachedPrice(price: any) {
    await put('price_cache', price);
  },

  async clearExpiredPrices(): Promise<number> {
    const now = Date.now();
    const all = await getAll<any>('price_cache');
    let count = 0;
    for (const item of all) {
      if (item.expires_at < now) {
        await remove('price_cache', item.symbol);
        count++;
      }
    }
    return count;
  },

  // Exchange rates
  async getCachedExchangeRate(fromCurrency: string, toCurrency: string) {
    return getOne<any>('exchange_rates', [fromCurrency, toCurrency]);
  },

  async setCachedExchangeRate(rate: any) {
    await put('exchange_rates', rate);
  },

  async clearExpiredExchangeRates(): Promise<number> {
    const now = Date.now();
    const all = await getAll<any>('exchange_rates');
    let count = 0;
    for (const item of all) {
      if (item.expires_at < now) {
        await remove('exchange_rates', [item.from_currency, item.to_currency]);
        count++;
      }
    }
    return count;
  },
};
