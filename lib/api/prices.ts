import type { AssetType } from '../types';
import { fetchYahooPrice, searchYahooSymbol } from './providers/yahoo';
import { fetchKrakenPrice, searchKrakenAssets } from './providers/kraken';
import { isSimpleAssetType } from '../constants/assetTypes';

export interface PriceResult {
  price: number;
  currency: string;
  name?: string;
}

// Fetch price from appropriate provider based on asset type
export async function fetchPriceForAsset(
  symbol: string,
  assetType: AssetType,
  preferredCurrency?: string
): Promise<PriceResult | null> {
  if (assetType === 'crypto' || assetType === 'bitcoin') {
    return fetchKrakenPrice(symbol, preferredCurrency);
  }

  // Simple asset types (cash, real-estate, other) don't fetch prices
  // Price is always 1 in the asset's currency (value comes from quantity in lots)
  if (isSimpleAssetType(assetType)) {
    return { price: 1, currency: preferredCurrency || 'EUR' };
  }

  // Stocks, ETFs, bonds, commodities - use Yahoo Finance
  return fetchYahooPrice(symbol);
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange?: string;
}

export async function searchSymbol(
  query: string,
  assetType?: AssetType
): Promise<SearchResult[]> {
  if (!query || query.length < 1) {
    return [];
  }

  if (assetType === 'crypto') {
    const results = await searchKrakenAssets(query);
    return results.map((r) => ({
      symbol: r.symbol,
      name: r.name,
      type: 'Cryptocurrency',
    }));
  }

  // Default to Yahoo for stocks/ETFs
  const results = await searchYahooSymbol(query);
  return results.map((r) => ({
    symbol: r.symbol,
    name: r.name,
    type: r.type,
    exchange: r.exchange,
  }));
}
