import { v4 as uuidv4 } from 'uuid';
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
    createdAt: new Date(row.created_at),
  };
}

export async function getAssetsByPortfolioId(portfolioId: string): Promise<Asset[]> {
  if (isWeb()) {
    const rows = await webDb.getAssetsByPortfolioId(portfolioId);
    return rows.map(rowToAsset);
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
    const row = await webDb.getAssetById(id);
    return row ? rowToAsset(row) : null;
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
  currency: string = 'EUR'
): Promise<Asset> {
  const id = uuidv4();
  const now = Date.now();
  const row: AssetRow = {
    id,
    portfolio_id: portfolioId,
    symbol: symbol.toUpperCase(),
    name: name ?? null,
    type,
    currency,
    created_at: now,
  };

  if (isWeb()) {
    await webDb.createAsset(row);
  } else {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO assets (id, portfolio_id, symbol, name, type, currency, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, portfolioId, symbol.toUpperCase(), name ?? null, type, currency, now]
    );
  }

  return {
    id,
    portfolioId,
    symbol: symbol.toUpperCase(),
    name: name ?? null,
    type,
    currency,
    createdAt: new Date(now),
  };
}

export async function updateAsset(
  id: string,
  updates: { symbol?: string; name?: string; type?: AssetType; currency?: string }
): Promise<Asset | null> {
  const asset = await getAssetById(id);
  if (!asset) return null;

  const newSymbol = updates.symbol?.toUpperCase() ?? asset.symbol;
  const newName = updates.name ?? asset.name;
  const newType = updates.type ?? asset.type;
  const newCurrency = updates.currency ?? asset.currency;

  if (isWeb()) {
    await webDb.updateAsset({
      id,
      portfolio_id: asset.portfolioId,
      symbol: newSymbol,
      name: newName,
      type: newType,
      currency: newCurrency,
      created_at: asset.createdAt.getTime(),
    });
  } else {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE assets SET symbol = ?, name = ?, type = ?, currency = ? WHERE id = ?',
      [newSymbol, newName, newType, newCurrency, id]
    );
  }

  return {
    ...asset,
    symbol: newSymbol,
    name: newName,
    type: newType,
    currency: newCurrency,
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
    const row = await webDb.getAssetBySymbol(portfolioId, symbol.toUpperCase());
    return row ? rowToAsset(row) : null;
  }

  const db = await getDatabase();
  const row = await db.getFirstAsync<AssetRow>(
    'SELECT * FROM assets WHERE portfolio_id = ? AND symbol = ?',
    [portfolioId, symbol.toUpperCase()]
  );
  return row ? rowToAsset(row) : null;
}
