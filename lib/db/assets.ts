import { generateUUID } from '../utils/uuid';
import { getDatabase, isWeb } from './schema';
import { webDb } from './webDatabase';
import type { Asset, AssetType } from '../types';

interface AssetRow {
  id: string;
  portfolio_id: string;
  symbol: string;
  name: string | null;
  type: AssetType;
  currency: string;
  tags: string; // JSON string for SQLite
  created_at: number;
}

function rowToAsset(row: AssetRow): Asset {
  let tags: string[] = [];
  try {
    tags = JSON.parse(row.tags || '[]');
  } catch {
    tags = [];
  }

  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    symbol: row.symbol,
    name: row.name,
    type: row.type,
    currency: row.currency,
    tags,
    createdAt: new Date(row.created_at),
  };
}

export async function getAllAssetTags(): Promise<string[]> {
  if (isWeb()) {
    return webDb.getAllAssetTags();
  }

  const db = await getDatabase();
  const rows = await db.getAllAsync<{ tags: string }>('SELECT tags FROM assets');

  const allTags = new Set<string>();
  for (const row of rows) {
    try {
      const tags = JSON.parse(row.tags || '[]') as string[];
      for (const tag of tags) {
        allTags.add(tag);
      }
    } catch {
      // ignore invalid JSON
    }
  }

  return Array.from(allTags).sort();
}

export async function getAssetsByPortfolioId(portfolioId: string): Promise<Asset[]> {
  if (isWeb()) {
    return webDb.getAssetsByPortfolioId(portfolioId);
  }

  const db = await getDatabase();
  const rows = await db.getAllAsync<AssetRow>(
    'SELECT * FROM assets WHERE portfolio_id = ? ORDER BY symbol ASC',
    [portfolioId]
  );
  return rows.map(rowToAsset);
}

export async function getAssetById(id: string): Promise<Asset | null> {
  if (isWeb()) {
    return webDb.getAssetById(id);
  }

  const db = await getDatabase();
  const row = await db.getFirstAsync<AssetRow>(
    'SELECT * FROM assets WHERE id = ?',
    [id]
  );
  return row ? rowToAsset(row) : null;
}

export async function createAsset(
  portfolioId: string,
  symbol: string,
  type: AssetType,
  name?: string,
  currency: string = 'EUR',
  tags: string[] = []
): Promise<Asset> {
  const id = generateUUID();
  const now = Date.now();

  if (isWeb()) {
    await webDb.createAsset({
      id,
      portfolio_id: portfolioId,
      symbol: symbol.toUpperCase(),
      name: name ?? null,
      type,
      currency,
      tags,
      created_at: now,
    });
  } else {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO assets (id, portfolio_id, symbol, name, type, currency, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, portfolioId, symbol.toUpperCase(), name ?? null, type, currency, JSON.stringify(tags), now]
    );
  }

  return {
    id,
    portfolioId,
    symbol: symbol.toUpperCase(),
    name: name ?? null,
    type,
    currency,
    tags,
    createdAt: new Date(now),
  };
}

export async function updateAsset(
  id: string,
  updates: { symbol?: string; name?: string; type?: AssetType; currency?: string; tags?: string[] }
): Promise<Asset | null> {
  const asset = await getAssetById(id);
  if (!asset) {
    return null;
  }

  const newSymbol = updates.symbol?.toUpperCase() ?? asset.symbol;
  const newName = updates.name ?? asset.name;
  const newType = updates.type ?? asset.type;
  const newCurrency = updates.currency ?? asset.currency;
  const newTags = updates.tags ?? asset.tags;

  if (isWeb()) {
    await webDb.updateAsset({
      id,
      portfolio_id: asset.portfolioId,
      symbol: newSymbol,
      name: newName,
      type: newType,
      currency: newCurrency,
      tags: newTags,
      created_at: asset.createdAt.getTime(),
    });
  } else {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE assets SET symbol = ?, name = ?, type = ?, currency = ?, tags = ? WHERE id = ?',
      [newSymbol, newName, newType, newCurrency, JSON.stringify(newTags), id]
    );
  }

  return {
    ...asset,
    symbol: newSymbol,
    name: newName,
    type: newType,
    currency: newCurrency,
    tags: newTags,
  };
}

export async function deleteAsset(id: string): Promise<boolean> {
  if (isWeb()) {
    await webDb.deleteAsset(id);
    return true;
  }

  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM assets WHERE id = ?', [id]);
  return result.changes > 0;
}

export async function getAssetBySymbol(
  portfolioId: string,
  symbol: string
): Promise<Asset | null> {
  if (isWeb()) {
    return webDb.getAssetBySymbol(portfolioId, symbol.toUpperCase());
  }

  const db = await getDatabase();
  const row = await db.getFirstAsync<AssetRow>(
    'SELECT * FROM assets WHERE portfolio_id = ? AND symbol = ?',
    [portfolioId, symbol.toUpperCase()]
  );
  return row ? rowToAsset(row) : null;
}
