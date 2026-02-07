import { generateId } from '../utils/generateId';
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
  category_id: string | null;
  created_at: number;
}

function rowToAsset(row: AssetRow): Asset {
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

export async function getAllAssets(): Promise<Asset[]> {
  if (isWeb()) {
    return webDb.getAllAssets();
  }

  const db = await getDatabase();
  const rows = await db.getAllAsync<AssetRow>(
    'SELECT * FROM assets ORDER BY symbol ASC'
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
  categoryId: string | null = null
): Promise<Asset> {
  const id = generateId();
  const now = Date.now();

  if (isWeb()) {
    await webDb.createAsset({
      id,
      portfolio_id: portfolioId,
      symbol: symbol.toUpperCase(),
      name: name ?? null,
      type,
      currency,
      category_id: categoryId,
      created_at: now,
    });
  } else {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO assets (id, portfolio_id, symbol, name, type, currency, category_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, portfolioId, symbol.toUpperCase(), name ?? null, type, currency, categoryId, now]
    );
  }

  return {
    id,
    portfolioId,
    symbol: symbol.toUpperCase(),
    name: name ?? null,
    type,
    currency,
    categoryId,
    createdAt: new Date(now),
  };
}

export async function updateAsset(
  id: string,
  updates: { symbol?: string; name?: string; type?: AssetType; currency?: string; categoryId?: string | null }
): Promise<Asset | null> {
  const asset = await getAssetById(id);
  if (!asset) {
    return null;
  }

  const newSymbol = updates.symbol?.toUpperCase() ?? asset.symbol;
  const newName = updates.name ?? asset.name;
  const newType = updates.type ?? asset.type;
  const newCurrency = updates.currency ?? asset.currency;
  const newCategoryId = updates.categoryId !== undefined ? updates.categoryId : asset.categoryId;

  if (isWeb()) {
    await webDb.updateAsset({
      id,
      portfolio_id: asset.portfolioId,
      symbol: newSymbol,
      name: newName,
      type: newType,
      currency: newCurrency,
      category_id: newCategoryId,
      created_at: asset.createdAt.getTime(),
    });
  } else {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE assets SET symbol = ?, name = ?, type = ?, currency = ?, category_id = ? WHERE id = ?',
      [newSymbol, newName, newType, newCurrency, newCategoryId, id]
    );
  }

  return {
    ...asset,
    symbol: newSymbol,
    name: newName,
    type: newType,
    currency: newCurrency,
    categoryId: newCategoryId,
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
