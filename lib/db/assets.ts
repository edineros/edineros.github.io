import { generateId } from '../utils/generateId';
import { webDb } from './webDatabase';
import type { Asset, AssetType } from '../types';

export async function getAssetsByPortfolioId(portfolioId: string): Promise<Asset[]> {
  return webDb.getAssetsByPortfolioId(portfolioId);
}

export async function getAllAssets(): Promise<Asset[]> {
  return webDb.getAllAssets();
}

export async function getAssetById(id: string): Promise<Asset | null> {
  return webDb.getAssetById(id);
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
  await webDb.deleteAsset(id);
  return true;
}

export async function getAssetBySymbol(
  portfolioId: string,
  symbol: string
): Promise<Asset | null> {
  return webDb.getAssetBySymbol(portfolioId, symbol.toUpperCase());
}
